#!/usr/bin/env bash
# Prepares a fresh Ubuntu or Debian VPS. Safe to re-run. Run as root or with sudo:
#   sudo ./bootstrap-vps.sh deploy
# Installs Docker and basic protection, and creates the deploy user and /srv/sidana.
# Password login is left as it is, so this can't lock you out. See deploy/README.md.
set -euo pipefail

DEPLOY_USER="${1:-deploy}"
[ "$(id -u)" = 0 ] || { echo "Run this as root or with sudo." >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl ufw fail2ban unattended-upgrades

if ! command -v docker > /dev/null; then
  . /etc/os-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

id "$DEPLOY_USER" > /dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
# Membership of the docker group is effectively root access, so guard this user's keys.
usermod -aG docker "$DEPLOY_USER"
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/sidana

# Open the SSH port in use before turning the firewall on. The current connection is the
# surest source. `sshd -T` is only a fallback, and its failure must not stop this script.
SSH_PORT="${SSH_CONNECTION:+${SSH_CONNECTION##* }}"
if [ -z "$SSH_PORT" ]; then
  mkdir -p /run/sshd
  SSH_PORT="$(sshd -T 2>/dev/null | awk '$1=="port"{print $2; exit}' || true)"
fi
ufw allow "${SSH_PORT:-22}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

# A small VPS needs swap so a memory spike slows things down instead of killing the app.
if [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile > /dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "Ready. Next: add the CI public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
