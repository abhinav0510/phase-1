# Sidana Ventures Founder Dashboard: architecture handbook

A guide for a developer joining the project with no prior context. Start with the overview, then follow the [developer onboarding](16-DEVELOPER-ONBOARDING.md) path.

**Snapshot:** 31 October 2026. Infrastructure changes, so re-check anything you depend on.

## How to read the evidence labels

| Label | Meaning |
|---|---|
| **Observed** | Seen on the running system or in GitHub during this study |
| **Config** | Read from a file in the repository |
| **Inferred** | A reasoned conclusion, not directly seen |
| **Not verified** | Couldn't be checked with the access available |
| **Needs admin** | Requires an administrator to confirm |

This handbook contains setting names only. It leaves out secret values, the server's IP address, webhook addresses, spreadsheet IDs and the Supabase project reference, because this repository is public.

## Documents

| # | Document | Read it to learn |
|---|---|---|
| 00 | [Executive overview](00-EXECUTIVE-OVERVIEW.md) | What exists, current status and known gaps |
| 01 | [System architecture](01-SYSTEM-ARCHITECTURE.md) | How all the parts fit together |
| 02 | [Frontend architecture](02-FRONTEND-ARCHITECTURE.md) | Pages, layouts and components |
| 03 | [Backend architecture](03-BACKEND-ARCHITECTURE.md) | Server code and how requests flow |
| 04 | [Database and Supabase](04-DATABASE-AND-SUPABASE.md) | Tables, clients and data access |
| 05 | [n8n and integrations](05-N8N-AND-INTEGRATIONS.md) | Automation and outside services |
| 06 | [GitHub and branching](06-GITHUB-AND-BRANCHING.md) | Branches, pull requests and git commands |
| 07 | [GitHub Actions and CI/CD](07-GITHUB-ACTIONS-AND-CICD.md) | Automated checks and releases |
| 08 | [Docker architecture](08-DOCKER-ARCHITECTURE.md) | Images, containers and volumes |
| 09 | [Hostinger VPS infrastructure](09-HOSTINGER-VPS-INFRASTRUCTURE.md) | The production server |
| 10 | [Networking and ports](10-NETWORKING-AND-PORTS.md) | Every port, and who can reach it |
| 11 | [Domain, DNS and SSL](11-DOMAIN-DNS-AND-SSL.md) | How the address reaches the server |
| 12 | [Authentication and security](12-AUTHENTICATION-AND-SECURITY.md) | Sign-in, roles and protections |
| 13 | [Health, logging and monitoring](13-HEALTH-LOGGING-AND-MONITORING.md) | How to tell if the system is healthy |
| 14 | [Testing and quality assurance](14-TESTING-AND-QUALITY-ASSURANCE.md) | Test suites and fake services |
| 15 | [Deployment and rollback](15-DEPLOYMENT-AND-ROLLBACK.md) | Releasing and going back |
| 16 | [Developer onboarding](16-DEVELOPER-ONBOARDING.md) | Your first day |
| 17 | [Troubleshooting runbook](17-TROUBLESHOOTING-RUNBOOK.md) | What to do when something breaks |
| 18 | [Technical glossary](18-TECHNICAL-GLOSSARY.md) | Plain-language definitions |
