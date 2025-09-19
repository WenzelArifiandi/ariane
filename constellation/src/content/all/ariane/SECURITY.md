# Security Policy

## 🛡️ Security Overview

We take the security of Ariane seriously. This document outlines our security practices and how to report security vulnerabilities.

## 📋 Supported Versions

We provide security updates for the following versions:

| Version | Supported       |
| ------- | --------------- |
| Latest  | ✅ Full support |
| Main    | ✅ Full support |

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

### 1. **DO NOT** create a public issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Report privately via GitHub Security Advisories

1. Go to the [Security tab](https://github.com/WenzelArifiandi/ariane/security) of this repository
2. Click "Report a vulnerability"
3. Fill out the vulnerability report form with:
   - **Description**: Clear description of the vulnerability
   - **Steps to reproduce**: Detailed steps to reproduce the issue
   - **Impact**: Potential impact and severity
   - **Affected components**: Which parts of the system are affected
   - **Suggested fix**: If you have ideas for how to fix it

### 3. Alternative reporting methods

If GitHub Security Advisories is not available, you can report via:

- **Email**: [Create an issue](https://github.com/WenzelArifiandi/ariane/issues/new?template=security-report.md&title=[SECURITY]%20) with the `[SECURITY]` prefix
- **Contact**: Reach out through the repository's contact methods

## ⏱️ Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-72 hours
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Best effort

## 🔒 Vulnerability Types

We're particularly interested in vulnerabilities related to:

### Authentication & Authorization

- Authentication bypass
- Privilege escalation
- Session management issues
- OAuth/OIDC vulnerabilities

### Data Security

- SQL injection
- NoSQL injection
- Data exposure
- Sensitive data leakage

### Web Application Security

- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Server-Side Request Forgery (SSRF)
- Path traversal
- File upload vulnerabilities

### Infrastructure Security

- Container security issues
- Dependency vulnerabilities
- Configuration security
- Secrets exposure

### API Security

- API authentication/authorization flaws
- Rate limiting bypass
- Input validation issues
- Information disclosure

## 🏆 Security Recognition

We believe in recognizing security researchers who help improve our security:

- **Public Recognition**: With permission, we'll acknowledge your contribution
- **CVE Assignment**: For qualifying vulnerabilities
- **Security Advisory**: We'll publish advisories for significant issues

## 🛠️ Our Security Measures

### Automated Security

- **CodeQL Analysis**: Continuous code scanning
- **Dependency Scanning**: Automated vulnerability detection
- **Secret Scanning**: Prevention of credential exposure
- **SAST/DAST**: Static and dynamic analysis

### Security Practices

- **Regular Updates**: Dependencies and security patches
- **Code Review**: All changes reviewed for security
- **Least Privilege**: Minimal access principles
- **Encryption**: Data at rest and in transit

### Monitoring & Response

- **Security Monitoring**: Continuous security monitoring
- **Incident Response**: Defined response procedures
- **Regular Audits**: Periodic security assessments

## 📚 Security Resources

### Documentation

- [Authentication Guide](./docs/auth.md)
- [API Security](./docs/api-security.md)
- [Deployment Security](./docs/deployment.md)

### Tools & Libraries

- **WebAuthn**: Passwordless authentication
- **Zitadel**: Identity and access management
- **CSP Headers**: Content Security Policy
- **Security Headers**: Comprehensive protection

## 🤝 Security Contact

For security-related questions or concerns:

- **GitHub**: Use repository issues with `[SECURITY]` prefix
- **Maintainer**: @WenzelArifiandi
- **Security Team**: Available via GitHub discussions

## 📜 Disclosure Policy

### Coordinated Disclosure

- We follow responsible disclosure practices
- We'll work with researchers to understand and fix issues
- We'll coordinate on public disclosure timing

### Public Disclosure

- Security advisories published after fixes
- CVE assignment for qualifying vulnerabilities
- Credit given to researchers (with permission)

## ⚖️ Legal

- We will not pursue legal action against researchers who:
  - Follow this security policy
  - Act in good faith
  - Do not harm users or systems
  - Do not access/modify/delete data without permission

## 🔄 Policy Updates

This security policy may be updated periodically. Please check back regularly for the latest version.

---

**Last Updated**: September 2025
**Version**: 1.0
**Contact**: [GitHub Issues](https://github.com/WenzelArifiandi/ariane/issues)

---

## 🧹 Code Scanning Noise Reduction

Generated build artifacts (for example `studio/dist`, `site/dist`, Astro's `_astro`) are excluded from security analysis. Code scanning alerts on these files are non-actionable and may be dismissed.

To bulk-dismiss non-actionable alerts:

- OSSF Scorecard alerts (repository health metrics) should be dismissed from Code Scanning.
- Alerts pointing at generated files in `studio/dist/` and `site/dist/` should be dismissed.

Automate this cleanup with:

```
scripts/dismiss-code-scanning-alerts.sh
```

Requirements: GitHub CLI (`gh`) authenticated with permissions to manage code scanning alerts.
