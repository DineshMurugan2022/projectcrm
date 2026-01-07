# 🔐 Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please email us at **security@mechdev.com** instead of using the issue tracker.

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue.

---

## 🛡️ Security Best Practices

### 1. Authentication & Authorization

#### JWT Token Security
- **Token Expiration:** Tokens expire after 24 hours
- **Secure Storage:** Store tokens in httpOnly cookies (not localStorage)
- **Token Refresh:** Implement token refresh mechanism
- **Strong Secrets:** Use minimum 32-character random JWT_SECRET

```env
# Generate strong secret
JWT_SECRET=$(openssl rand -base64 32)
```

#### Password Security
- **Minimum Length:** 8 characters
- **Complexity:** Require uppercase, lowercase, numbers, special characters
- **Hashing:** bcrypt with salt rounds = 10
- **Password Reset:** Use time-limited tokens

```javascript
// Example: Strong password validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

#### Role-Based Access Control (RBAC)
- **Admin:** Full system access
- **Team Leader:** Team management, reports
- **BDM:** Appointments, leads
- **Tech Team:** Queries, technical tasks
- **Customer Support:** Query handling
- **Telecaller:** Basic lead access

---

### 2. Data Protection

#### Sensitive Data Encryption
```javascript
// Encrypt sensitive fields before storing
const crypto = require('crypto');

function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

#### Database Security
- **Connection String:** Never commit to version control
- **IP Whitelisting:** Restrict database access
- **Encryption at Rest:** Enable MongoDB encryption
- **Regular Backups:** Automated daily backups
- **Access Logs:** Monitor database access

```javascript
// MongoDB connection with security options
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  sslValidate: true
});
```

---

### 3. Input Validation & Sanitization

#### Prevent Injection Attacks
```javascript
// Example: Input validation middleware
const { body, validationResult } = require('express-validator');

router.post('/leads', [
  body('companyName').trim().escape().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('phone').matches(/^\+?[1-9]\d{1,14}$/),
  body('amount').isNumeric()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

#### XSS Prevention
- **Sanitize HTML:** Use DOMPurify on frontend
- **Content Security Policy:** Set strict CSP headers
- **Escape Output:** Always escape user-generated content

```javascript
// Helmet CSP configuration
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "wss:", "https:"]
  }
}));
```

---

### 4. API Security

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many login attempts'
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

#### CORS Configuration
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

#### Request Size Limits
```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

---

### 5. File Upload Security

#### Validation
```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, Date.now() + '-' + sanitized);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = /jpeg|jpg|png|pdf|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

#### Virus Scanning
```javascript
// Integrate ClamAV or similar
const NodeClam = require('clamscan');
const clamscan = new NodeClam().init();

async function scanFile(filePath) {
  const { isInfected, viruses } = await clamscan.scanFile(filePath);
  if (isInfected) {
    fs.unlinkSync(filePath);
    throw new Error(`Virus detected: ${viruses.join(', ')}`);
  }
}
```

---

### 6. Session Management

#### Secure Session Configuration
```javascript
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'strict'
  }
}));
```

---

### 7. Logging & Monitoring

#### Security Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log security events
function logSecurityEvent(event, details) {
  logger.warn({
    type: 'security',
    event: event,
    details: details,
    timestamp: new Date().toISOString()
  });
}

// Example usage
logSecurityEvent('failed_login', { username: 'admin', ip: req.ip });
```

#### Monitor for Suspicious Activity
- Multiple failed login attempts
- Unusual API usage patterns
- Large file uploads
- Database query anomalies
- Unauthorized access attempts

---

### 8. Environment Variables

#### Never Commit Secrets
```bash
# .gitignore
.env
.env.local
.env.production
```

#### Use Environment-Specific Configs
```javascript
// config/index.js
module.exports = {
  development: {
    db: process.env.DEV_MONGODB_URI,
    jwtSecret: process.env.DEV_JWT_SECRET
  },
  production: {
    db: process.env.PROD_MONGODB_URI,
    jwtSecret: process.env.PROD_JWT_SECRET
  }
}[process.env.NODE_ENV || 'development'];
```

---

### 9. HTTPS & SSL/TLS

#### Force HTTPS in Production
```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

#### SSL Certificate
```bash
# Let's Encrypt (free SSL)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### 10. Dependency Security

#### Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

#### Use Snyk or Dependabot
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

### 11. Error Handling

#### Don't Expose Stack Traces
```javascript
app.use((err, req, res, next) => {
  // Log error
  logger.error(err.stack);
  
  // Send generic error to client
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});
```

---

### 12. Database Security Checklist

- [ ] Use strong, unique passwords
- [ ] Enable authentication
- [ ] Use IP whitelisting
- [ ] Enable encryption at rest
- [ ] Enable encryption in transit (SSL/TLS)
- [ ] Regular backups
- [ ] Principle of least privilege
- [ ] Monitor access logs
- [ ] Use prepared statements (prevent SQL injection)
- [ ] Validate all inputs

---

### 13. Production Deployment Checklist

- [ ] Change all default credentials
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set NODE_ENV=production
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Enable database backups
- [ ] Use environment variables for secrets
- [ ] Implement logging
- [ ] Set up firewall rules
- [ ] Use process manager (PM2)
- [ ] Enable security headers (Helmet)
- [ ] Implement CSP
- [ ] Regular security audits

---

## 🚨 Incident Response Plan

### If a Security Breach Occurs:

1. **Immediate Actions:**
   - Isolate affected systems
   - Change all passwords and secrets
   - Revoke compromised tokens
   - Review access logs

2. **Investigation:**
   - Identify breach source
   - Assess data exposure
   - Document timeline

3. **Remediation:**
   - Patch vulnerabilities
   - Restore from clean backups
   - Notify affected users

4. **Prevention:**
   - Update security measures
   - Conduct security audit
   - Train team members

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

---

## 📞 Contact

For security concerns: **security@mechdev.com**

---

**Last Updated:** January 2026  
**Version:** 1.0
