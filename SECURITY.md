# Security Guide

This document outlines the security measures, scanning tools, and best practices implemented in RadioCalico.

## Security Scanning

### Quick Security Check
```bash
make security          # Comprehensive security scan
make security-report   # Generate detailed security report
```

### Available Security Commands

#### NPM Dependency Scanning
```bash
make security-audit           # Run npm security audit
make security-audit-fix       # Automatically fix vulnerabilities
make security-audit-force     # Force fix (potentially breaking)
make security-outdated        # Check for outdated packages
make security-licenses        # Check package licenses
```

#### Docker Security Scanning
```bash
make security-docker          # Scan Docker images with Trivy
make security-config          # Validate security configurations
```

#### NPM Scripts
```bash
npm run security:audit        # npm audit
npm run security:audit:fix    # npm audit fix
npm run security:check        # npm audit with moderate level
npm run security:outdated     # npm outdated
npm run security:licenses     # License checker
```

## Security Measures Implemented

### 1. Container Security
- **Non-root users**: All containers run as unprivileged users (uid 1001)
- **Read-only filesystems**: Prevents runtime file modifications
- **Capability restrictions**: Minimal Linux capabilities with `cap_drop: ALL`
- **No new privileges**: `no-new-privileges:true` prevents privilege escalation
- **Tmpfs mounts**: Temporary files in memory, not persistent storage

### 2. Network Security
- **Internal networking**: Database and backend communication on private Docker network
- **Port exposure**: Only nginx port 80 exposed externally
- **Service isolation**: Each service runs in separate container

### 3. Web Security Headers
```nginx
X-Frame-Options: SAMEORIGIN           # Prevent clickjacking
X-XSS-Protection: 1; mode=block       # XSS protection
X-Content-Type-Options: nosniff       # MIME type sniffing protection
Referrer-Policy: no-referrer-when-downgrade  # Referrer policy
```

### 4. Database Security
- **Credential management**: Environment variable based configuration
- **Network isolation**: PostgreSQL not exposed externally
- **User privileges**: Dedicated database user with minimal required permissions
- **Connection pooling**: Prevents connection exhaustion attacks

### 5. Application Security
- **Input validation**: Express.js with proper request parsing limits
- **CORS configuration**: Cross-origin resource sharing controls
- **Helmet.js**: Security middleware with CSP and other protections
- **Morgan logging**: Request logging for audit trails

## CI/CD Security Pipeline

### Automated Security Checks
The CI/CD pipeline includes comprehensive security scanning:

1. **NPM Audit**: Dependency vulnerability scanning
2. **Configuration Validation**: Docker and nginx security settings
3. **Docker Image Scanning**: Trivy vulnerability scanner
4. **Security Headers**: Verification of web security headers
5. **SARIF Integration**: Results uploaded to GitHub Security tab

### Security Jobs
- `security`: NPM audit and configuration checks (runs on all pushes)
- `docker-security`: Docker image vulnerability scanning (runs on PRs)

## Security Monitoring

### Regular Security Tasks

#### Daily
```bash
make security-audit    # Check for new vulnerabilities
make health           # Verify service health
```

#### Weekly
```bash
make security-report     # Generate comprehensive report
make security-outdated  # Check for package updates
```

#### Monthly
```bash
make security-docker     # Full Docker image scan
make security-licenses  # Review package licenses
```

### Security Alerts
- **GitHub Dependabot**: Automated dependency vulnerability alerts
- **Trivy Scanning**: Container vulnerability detection
- **NPM Audit**: Real-time dependency monitoring

## Security Best Practices

### Development
1. **Keep dependencies updated**: Regular `npm update` and security patches
2. **Use environment variables**: Never hardcode secrets in code
3. **Validate inputs**: Always sanitize and validate user inputs
4. **Secure defaults**: Use secure configurations by default
5. **Minimal dependencies**: Only include necessary packages

### Production Deployment
1. **Change default passwords**: Update DB_PASSWORD in `.env.production`
2. **Use HTTPS**: Configure SSL certificates with nginx
3. **Monitor logs**: Set up centralized logging and monitoring
4. **Regular backups**: Automated database backups with encryption
5. **Update strategy**: Plan for security updates and patches

### Docker Security
1. **Multi-stage builds**: Separate build and runtime environments
2. **Minimal base images**: Use Alpine Linux for smaller attack surface
3. **Security scanning**: Regular Trivy scans of production images
4. **Secrets management**: Use Docker secrets or external secret stores
5. **Resource limits**: Configure memory and CPU limits

## Incident Response

### Security Vulnerability Response
1. **Assessment**: Evaluate severity and impact
2. **Patching**: Apply security updates immediately
3. **Testing**: Verify fixes don't break functionality
4. **Deployment**: Deploy patches to production
5. **Communication**: Notify stakeholders if necessary

### Security Incident Checklist
- [ ] Identify affected systems and data
- [ ] Contain the incident
- [ ] Assess the damage
- [ ] Remove the threat
- [ ] Recover and restore
- [ ] Document lessons learned

## Security Configuration Reference

### Environment Variables (Production)
```bash
DB_PASSWORD=<strong-password>     # PostgreSQL password
NODE_ENV=production               # Environment mode
DB_HOST=postgres                  # Database host
DB_USER=radiocalico              # Database user
```

### Docker Security Settings
```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
read_only: true
tmpfs:
  - /tmp:noexec,nosuid,size=100m
```

### Nginx Security Configuration
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## Security Tools Integration

### Trivy (Container Scanning)
- Vulnerability detection in container images
- CVE database scanning
- SARIF output for GitHub integration

### NPM Audit
- Node.js dependency vulnerability scanning
- Automatic fix suggestions
- Severity level filtering

### GitHub Security Features
- Dependabot alerts
- Security advisory database
- SARIF upload integration
- Secret scanning

## Compliance Considerations

### Data Protection
- **GDPR**: User data handling and privacy controls
- **Data retention**: Automatic cleanup of old data
- **Encryption**: Data at rest and in transit

### Security Standards
- **OWASP Top 10**: Common web application vulnerabilities
- **CIS Docker Benchmark**: Container security guidelines
- **NIST Framework**: Cybersecurity framework compliance

## Contact and Reporting

### Security Issues
Report security vulnerabilities to: [security contact]

### Security Updates
Stay informed about security updates through:
- GitHub Security Advisories
- NPM security bulletins
- Docker security announcements

---

**Last Updated**: $(date)
**Security Review**: Quarterly