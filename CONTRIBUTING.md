# Contributing to Enterprise CRM System

Thank you for considering contributing to our CRM system! This document provides guidelines for contributing.

## 🤝 How to Contribute

### Reporting Bugs

**Before submitting a bug report:**
- Check if the bug has already been reported
- Ensure you're using the latest version
- Collect relevant information (OS, Node version, error logs)

**Bug Report Template:**
```markdown
**Describe the bug**
A clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g., Windows 10]
- Node version: [e.g., 16.14.0]
- Browser: [e.g., Chrome 96]
```

### Suggesting Features

**Feature Request Template:**
```markdown
**Feature Description**
Clear description of the feature

**Problem it Solves**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other solutions you've thought about
```

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```

3. **Make your changes**
   - Follow coding standards
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/AmazingFeature
   ```

6. **Open a Pull Request**

## 📝 Coding Standards

### JavaScript/React

- Use ES6+ features
- Follow Airbnb style guide
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### File Structure

```
components/
├── ComponentName/
│   ├── ComponentName.jsx
│   ├── ComponentName.styles.js
│   └── index.js
```

### Naming Conventions

- **Components:** PascalCase (e.g., `UserProfile.jsx`)
- **Files:** camelCase (e.g., `userService.js`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Functions:** camelCase (e.g., `getUserData()`)

### Code Examples

**Good:**
```javascript
// Clear, descriptive function name
async function fetchUserAttendance(userId, startDate, endDate) {
  try {
    const response = await api.get('/attendance', {
      params: { userId, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch attendance:', error);
    throw error;
  }
}
```

**Bad:**
```javascript
// Unclear, no error handling
function getData(id, d1, d2) {
  return api.get('/attendance?userId=' + id);
}
```

## 🧪 Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for 80%+ code coverage

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📚 Documentation

- Update README.md if needed
- Add JSDoc comments for functions
- Update API.md for new endpoints

```javascript
/**
 * Fetches user attendance records
 * @param {string} userId - The user ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Attendance records
 */
async function fetchUserAttendance(userId, startDate, endDate) {
  // Implementation
}
```

## 🔄 Git Workflow

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(leads): add pagination to leads table

fix(auth): resolve token expiration issue

docs(api): update authentication endpoints
```

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-changed` - Code refactoring

## ✅ Pull Request Checklist

Before submitting:

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No console errors
- [ ] Responsive design tested
- [ ] Cross-browser tested

## 🎯 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/crm-system.git

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/crm-system.git

# Create branch
git checkout -b feature/my-feature

# Keep your fork updated
git fetch upstream
git merge upstream/main
```

## 📞 Questions?

- Open an issue for questions
- Join our Discord (if available)
- Email: dev@mechdev.com

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🎉**
