# Claude GitHub Integration Guide

This guide explains how to integrate Claude with your GitHub repository for automated code reviews and assistance.

## Integration Options

### Option 1: Official Claude GitHub Apps (Recommended)

Check the GitHub Marketplace for official Claude integrations:

1. **Visit GitHub Marketplace**: https://github.com/marketplace
2. **Search for "Claude"** or "Anthropic"
3. **Install official Claude apps** if available
4. **Configure permissions** for your repository

### Option 2: Custom GitHub App (Advanced)

Create a custom GitHub App using the provided manifest:

#### Step 1: Create GitHub App

1. **Go to GitHub App creation**: https://github.com/settings/apps/new
2. **Upload manifest**: Use `.github/claude-app-manifest.yml`
3. **Configure webhook URL**: Point to your Claude integration service
4. **Set permissions**:
   - Contents: Read
   - Issues: Write
   - Pull Requests: Write
   - Metadata: Read

#### Step 2: Install App on Repository

1. **Navigate to app settings**
2. **Click "Install App"**
3. **Select repositories** to install on
4. **Configure permissions**

#### Step 3: Set Up Webhook Handler

You'll need to create a service that:
- Receives GitHub webhooks
- Processes events (PR creation, comments, etc.)
- Calls Claude API for code analysis
- Posts responses back to GitHub

### Option 3: GitHub Actions Integration (Immediate)

Use the provided GitHub Actions workflow for basic Claude integration:

#### Step 1: Add Claude API Key

1. **Go to repository settings** → Secrets and variables → Actions
2. **Add new secret**: `CLAUDE_API_KEY`
3. **Enter your Claude API key** from Anthropic Console

#### Step 2: Enable Workflow

The workflow `.github/workflows/claude-integration.yml` is already configured to:

- **Trigger on pull requests**: Automatic code review
- **Respond to @claude mentions**: Answer questions in comments
- **Analyze changed files**: Focus on code that actually changed

#### Step 3: Customize Integration

Edit `.github/workflows/claude-integration.yml` to:

- **Add actual Claude API calls** (replace placeholder logic)
- **Configure file types** to analyze
- **Set review criteria** and prompts
- **Customize response format**

## Features Included

### 🔍 **Automated Code Review**
- Triggers on pull request creation/updates
- Analyzes changed files for potential issues
- Posts review comments with suggestions
- Focuses on code quality and best practices

### 💬 **Interactive Assistance**
- Responds to `@claude` mentions in issues/PRs
- Answers questions about code
- Provides explanations and suggestions
- Helps with debugging and optimization

### 🛡️ **Security Integration**
- Works with existing security scanning
- Integrates with make targets (`make security`)
- Provides security-focused code reviews
- Alerts on potential vulnerabilities

## Configuration

### Environment Variables

```bash
# Required
CLAUDE_API_KEY=your_claude_api_key_here

# Optional
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=4000
GITHUB_TOKEN=automatically_provided_by_actions
```

### Webhook Events

The integration responds to:
- `pull_request` - Code reviews
- `pull_request_review_comment` - Follow-up discussions
- `issue_comment` - Questions and assistance
- `push` - Continuous analysis (optional)

### Permissions Required

```yaml
contents: read        # Access repository files
issues: write         # Comment on issues
pull_requests: write  # Review pull requests
metadata: read        # Repository information
```

## Usage Examples

### Code Review
```
# Create PR → Claude automatically reviews
# Provides feedback on:
- Code quality
- Best practices
- Potential bugs
- Performance improvements
```

### Interactive Help
```
# Comment: "@claude explain this function"
# Claude responds with detailed explanation

# Comment: "@claude how can I optimize this?"
# Claude provides optimization suggestions
```

### Security Analysis
```
# Claude integrates with existing security tools
# Provides security-focused reviews
# Alerts on potential vulnerabilities
```

## Customization

### Review Prompts

Edit the workflow to customize what Claude reviews:

```yaml
- Security vulnerabilities
- Performance optimizations
- Code style and best practices
- Documentation completeness
- Test coverage
```

### Response Format

Customize Claude's response format:

```yaml
- Severity levels (info, warning, error)
- Specific feedback categories
- Integration with existing tools
- Custom review templates
```

## Integration with Existing Tools

### Make Targets
```bash
# Integrate with existing commands
make security          # Security scan + Claude review
make test             # Test results + Claude analysis
make lint             # Linting + Claude suggestions
```

### CI/CD Pipeline
```yaml
# Add to existing workflow
- run: make security
- run: make claude-review  # Custom target
- run: make test
```

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Check Claude API key in repository secrets
   - Verify key has necessary permissions
   - Ensure key hasn't expired

2. **Webhook Not Triggering**
   - Check webhook URL configuration
   - Verify app permissions
   - Review GitHub App installation

3. **Rate Limiting**
   - Implement request throttling
   - Use appropriate Claude model
   - Batch API requests when possible

### Debug Mode

Enable debug logging in workflow:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  CLAUDE_DEBUG: true
```

## Security Considerations

### API Key Management
- Store Claude API key in GitHub Secrets
- Use principle of least privilege
- Rotate keys regularly
- Monitor API usage

### Repository Access
- Grant minimum required permissions
- Review app access regularly
- Audit integration logs
- Restrict to specific repositories

### Data Privacy
- Claude processes code for analysis
- Review Anthropic's privacy policy
- Consider data retention policies
- Implement data sanitization if needed

## Next Steps

1. **Choose integration option** (GitHub App vs Actions)
2. **Set up Claude API key** in repository secrets
3. **Configure webhook/workflow** as needed
4. **Test integration** with sample PR
5. **Customize prompts** and responses
6. **Monitor usage** and performance

## Support

For issues with:
- **Claude API**: Contact Anthropic support
- **GitHub integration**: Check GitHub docs
- **Custom workflow**: Review Actions documentation
- **Repository setup**: Use existing make targets

---

**Note**: This integration enhances your existing development workflow and security scanning setup. It works alongside your current make targets and CI/CD pipeline.