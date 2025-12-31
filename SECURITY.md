# Security Documentation

**Last Updated:** 2025-12-31
**Security Level:** Medium-High (with authentication)

---

## Overview

This document describes the security measures implemented in the News Data API and provides setup instructions for production deployment.

---

## ✅ Implemented Security Measures

### 1. Authentication & Authorization

**Admin Endpoint Protection**
- All `/api/admin/*` endpoints require Bearer token authentication
- Protects expensive operations (crawl, transform, delete)
- Constant-time token comparison prevents timing attacks

**Setup Required:**
```bash
# Set the admin API key as a secret
wrangler secret put ADMIN_API_KEY

# Enter a strong, random API key (e.g., generated with)
openssl rand -base64 32
```

**Usage:**
```bash
curl -X POST https://your-api.com/api/admin/crawl \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["hackernews"], "count": 2}'
```

---

### 2. Rate Limiting

**IP-based rate limiting** using Cloudflare Workers KV:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Admin (`/api/admin/*`) | 10 requests | 1 minute |
| Transform (`/api/admin/transform`) | 5 requests | 1 minute |
| Read (`/api/articles/*`) | 60 requests | 1 minute |
| Public (`/api/subscriptions`) | 100 requests | 1 minute |

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1704067200000
```

**Rate Limit Exceeded:**
```json
HTTP 429 Too Many Requests
Retry-After: 42

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 42 seconds.",
  "retryAfter": 42
}
```

---

### 3. Input Validation

**Zod Schema Validation** for all user inputs:

```typescript
// Crawl requests
- sources: array of valid source names
- count: integer 1-20
- transform: boolean
- variant: enum (default|technical|casual|formal|brief)

// Transform requests
- articleId: string, max 100 chars, sanitized
- variants: array of valid transform types

// Subscriptions
- endpoint: valid HTTPS URL
- keys.p256dh: base64-encoded string
- keys.auth: base64-encoded string
```

**Article ID Sanitization:**
- Only allows: `a-zA-Z0-9_-`
- Blocks path traversal (`../`, `./`, `\`)
- Max length: 100 characters

---

### 4. Security Headers

All responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose:**
- Prevent MIME sniffing attacks
- Block clickjacking
- Enable XSS protection
- Control browser features
- Enforce HTTPS

---

### 5. Request Size Limits

**Maximum request body size:** 2MB

Prevents memory exhaustion attacks.

```json
HTTP 413 Payload Too Large

{
  "error": "Request too large",
  "message": "Maximum request size is 2097152 bytes"
}
```

---

### 6. Error Handling

**Production Mode:**
- Generic error messages (no information leakage)
- Full errors logged server-side only

**Development Mode:**
- Detailed error messages
- Stack traces included

**Set environment:**
```toml
# wrangler.toml
[vars]
ENVIRONMENT = "production"  # or "development"
```

---

## 🔐 Secrets Management

### Required Secrets

Set via `wrangler secret put <NAME>`:

```bash
# Admin authentication
wrangler secret put ADMIN_API_KEY

# Push notifications
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT

# AI/Transformation services
wrangler secret put OPENROUTER_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put SERPER_API_KEY

# Optional: News sources
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET
wrangler secret put SCRAPEDO_API_KEY
```

### Public Configuration

Set in `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
RESEARCH_MODEL = "x-ai/grok-4.1-fast"
PROMPT_STYLE = "random"
VAPID_PUBLIC_KEY = "your-public-key-here"
```

---

## 🚨 Security Checklist for Production

### Before Deployment:

- [ ] Set `ADMIN_API_KEY` secret with strong random value
- [ ] Set `ENVIRONMENT = "production"` in wrangler.toml
- [ ] Verify all API keys are stored as secrets (not in code)
- [ ] Update CORS allowed origins (if needed)
- [ ] Review R2 bucket permissions (ensure not public)
- [ ] Enable Cloudflare WAF rules (if available)
- [ ] Set up monitoring/alerting for failed auth attempts
- [ ] Document your admin API key securely

### After Deployment:

- [ ] Test authentication with valid API key
- [ ] Test authentication rejection with invalid key
- [ ] Verify rate limiting works
- [ ] Check security headers in responses
- [ ] Test input validation rejects malicious inputs
- [ ] Monitor logs for security events

---

## 🛡️ Security Best Practices

### For API Consumers

1. **Keep admin API key secret**
   - Never commit to git
   - Never expose in client-side code
   - Rotate periodically (quarterly recommended)

2. **Use HTTPS only**
   - Never send API keys over HTTP
   - Verify SSL certificates

3. **Respect rate limits**
   - Implement exponential backoff on 429 responses
   - Cache responses when possible

### For Administrators

1. **Monitor logs regularly**
   ```bash
   wrangler tail
   ```
   Look for:
   - Failed authentication attempts
   - Rate limit violations
   - Unusual access patterns

2. **Rotate secrets periodically**
   ```bash
   # Generate new key
   openssl rand -base64 32

   # Update secret
   wrangler secret put ADMIN_API_KEY
   ```

3. **Keep dependencies updated**
   ```bash
   bun update
   ```

4. **Review security audit quarterly**
   - Re-run security scan
   - Update this document
   - Address new vulnerabilities

---

## 🔍 Monitoring & Logging

### Security Events Logged

- Failed authentication attempts
- Rate limit violations
- Invalid input validation errors
- Admin operations (crawl, transform, clean)

### Log Format

```
[Auth] Failed authentication attempt from 192.0.2.1
[Auth] Authenticated request from 192.0.2.2
[RateLimit] Rate limit exceeded for 192.0.2.3
[Validation] Invalid article ID rejected: ../../../etc/passwd
```

### Recommended Monitoring

Set up alerts for:
- Spike in failed authentication (>10/minute)
- Unusual admin activity outside business hours
- High rate limit violations
- Error rate >5%

---

## 🚫 Known Limitations

1. **No OAuth/JWT support**
   - Single shared API key for all admins
   - Consider implementing OAuth for multi-user scenarios

2. **IP-based rate limiting**
   - Can be bypassed with multiple IPs
   - Consider implementing account-based limits

3. **No API key rotation workflow**
   - Requires manual secret update
   - Brief downtime during rotation

4. **No CAPTCHA for public endpoints**
   - Subscription endpoint could be automated
   - Consider adding Cloudflare Turnstile

---

## 📋 Compliance Notes

### GDPR Considerations

**User Rights:**
- Right to access: ✅ (GET /api/articles)
- Right to deletion: ⚠️ (not implemented)
- Right to portability: ✅ (JSON API)
- Right to be forgotten: ⚠️ (subscriptions not deletable)

**Data Retention:**
- Articles: Indefinite (no TTL set)
- Subscriptions: Indefinite
- Rate limit data: 24 hours TTL
- Audit logs: Recommended 90 days

**Recommendations:**
1. Implement subscription deletion endpoint
2. Add data retention policies
3. Document data processing activities (ROPA)
4. Obtain user consent for push notifications

---

## 🔄 Incident Response Plan

### If Admin API Key is Compromised:

1. **Immediate Actions:**
   ```bash
   # Generate new key
   NEW_KEY=$(openssl rand -base64 32)

   # Rotate secret
   wrangler secret put ADMIN_API_KEY
   # Enter new key

   # Deploy to activate
   wrangler deploy
   ```

2. **Investigation:**
   ```bash
   # Check logs for unauthorized access
   wrangler tail --search="[Auth]"

   # Review recent admin operations
   wrangler tail --search="[Admin]"
   ```

3. **Mitigation:**
   - Change all API keys
   - Review KV/R2 for unauthorized changes
   - Restore from backups if needed

4. **Prevention:**
   - Audit where keys were exposed
   - Update secret management practices
   - Consider implementing key rotation policy

---

## 📚 References

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [GDPR Compliance Guide](https://gdpr.eu/)

---

## 📞 Security Contact

For security issues, please:
1. Do NOT create public GitHub issues
2. Contact: [your-security-email]
3. Include "SECURITY" in subject line
4. Allow 48 hours for response

---

**Document Version:** 1.0
**Last Security Audit:** 2025-12-31
**Next Audit Due:** 2026-03-31 (Quarterly)
