# Contributing to Hotel Voice Bot

Thank you for your interest in contributing to the Hotel Voice Bot project! This guide outlines our development process, coding standards, and contribution requirements.

## Table of Contents

- [Development Workflow](#development-workflow)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Pull Request Process](#pull-request-process)
- [Tagging Requirements](#tagging-requirements)
- [Code Quality Standards](#code-quality-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)

## Development Workflow

### Standard Development Process

1. **Fork and Clone**: Fork the repository and clone your fork locally
2. **Create Feature Branch**: Create a new branch from `develop` for your feature
3. **Development**: Make your changes, ensuring all tests pass
4. **Pull Request**: Submit a PR to merge your branch into `develop`
5. **Code Review**: Address any feedback from reviewers
6. **Merge**: Once approved, your PR will be merged

### Hot-patch Process

For critical fixes that need immediate deployment:

1. **Create Hotfix Branch**: Create a branch from `main` using the `hotfix/` prefix
2. **Implement Fix**: Make minimal, targeted changes to resolve the critical issue
3. **Testing**: Ensure all tests pass and conduct thorough manual testing
4. **Pull Request**: Submit a PR with the `hotfix` label
5. **Code Review**: Get expedited review from team leads
6. **Tagging**: **REQUIRED** - Create and push a tag upon merge (see [Tagging Requirements](#tagging-requirements))
7. **Deploy**: Deploy to production following the [hot-patch runbook](./docs/runbooks/hot-patch.md)

## Branch Naming Conventions

- **Feature branches**: `feature/description-of-feature`
- **Bug fixes**: `bugfix/description-of-bug`
- **Hot-patches**: `hotfix/description-of-fix`
- **Documentation**: `docs/description-of-changes`
- **Infrastructure**: `infra/description-of-changes`

## Pull Request Process

### PR Requirements

All pull requests must:

1. **Follow the PR template**: Complete all relevant sections
2. **Include tests**: Add or update tests for your changes
3. **Pass CI checks**: All automated tests and linting must pass
4. **Include documentation**: Update relevant documentation
5. **Be reviewed**: Get approval from at least one team member

### PR Labels

Use appropriate labels to categorize your PR:

- `feature` - New functionality
- `bugfix` - Non-critical bug fixes
- `hotfix` - Critical fixes requiring immediate deployment
- `docs` - Documentation updates
- `infra` - Infrastructure/deployment changes
- `migration-critical` - Database migrations or other critical changes

## Tagging Requirements

### Tag on Merge Rule for Hotfix Branches

**MANDATORY**: All PRs from `hotfix/*` branches **MUST** be tagged upon merge to `main`.

#### Process:

1. **After PR is merged**, immediately create a tag:
   ```bash
   git tag hotfix-$(date +%Y-%m-%d)
   git push origin hotfix-$(date +%Y-%m-%d)
   ```

2. **Alternative tag format** (for multiple hotfixes same day):
   ```bash
   git tag hotfix-$(date +%Y-%m-%d)-01
   git push origin hotfix-$(date +%Y-%m-%d)-01
   ```

#### Examples:

- `hotfix-2025-01-17` - First hotfix on January 17, 2025
- `hotfix-2025-01-17-02` - Second hotfix on the same day
- `hotfix-2025-01-17-critical-auth` - Descriptive tag for critical auth fix

### Migration-Critical Tagging

PRs labeled `migration-critical` must also follow tagging requirements:

```bash
git tag migration-$(date +%Y-%m-%d)-description
git push origin migration-$(date +%Y-%m-%d)-description
```

### Automated Enforcement

- **GitHub Actions will fail** if a PR labeled `hotfix` or `migration-critical` is merged without creating a tag
- Tags must be pushed within 5 minutes of merge
- The CI system will verify tag existence and fail deployments if tags are missing

## Code Quality Standards

### Coding Standards

- **TypeScript**: Use strict TypeScript configuration
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Use Prettier for code formatting
- **Naming**: Use descriptive names for variables, functions, and classes

### File Organization

- **Group related functionality**: Keep related code in the same directory
- **Use barrel exports**: Export from index files for cleaner imports
- **Separate concerns**: Keep business logic separate from UI components

### Error Handling

- **Use proper error types**: Create custom error classes where appropriate
- **Handle errors gracefully**: Provide meaningful error messages
- **Log appropriately**: Use structured logging for debugging

## Testing Requirements

### Unit Tests

- **Coverage**: Maintain at least 80% test coverage
- **Test structure**: Follow Arrange-Act-Assert pattern
- **Mock external dependencies**: Use mocks for external services
- **Test edge cases**: Include tests for error conditions

### Integration Tests

- **API endpoints**: Test all API endpoints with realistic data
- **Database interactions**: Test database operations with test data
- **External integrations**: Mock external services appropriately

### Manual Testing

For hotfixes and critical changes:

1. **Test in staging**: Verify changes work in staging environment
2. **Regression testing**: Ensure existing functionality isn't broken
3. **Performance testing**: Check for performance degradation
4. **Security testing**: Verify no security vulnerabilities are introduced

## Documentation Standards

### Code Documentation

- **JSDoc comments**: Document all public functions and classes
- **Inline comments**: Explain complex logic or business rules
- **README updates**: Update relevant README files

### Operational Documentation

When making changes that affect operations:

1. **Update runbooks**: Modify relevant runbooks in `docs/runbooks/`
2. **Document known issues**: Add to "Known Issues/Caveats" sections
3. **Update deployment docs**: Modify `DEPLOYMENT.md` if needed

### Required Documentation Updates

- **API changes**: Update API documentation
- **Configuration changes**: Update environment variable documentation
- **Database changes**: Document migration procedures
- **Deployment changes**: Update deployment runbooks

## Security Guidelines

### Secrets Management

- **No hardcoded secrets**: Use environment variables or secret management
- **Secure API keys**: Store API keys in secure secret stores
- **Rotate credentials**: Regularly rotate access credentials

### Authentication & Authorization

- **Validate inputs**: Always validate and sanitize user inputs
- **Use HTTPS**: All communications must use HTTPS
- **Implement RBAC**: Use role-based access control where appropriate

## Getting Help

### Resources

- **Documentation**: Check `docs/` directory for detailed guides
- **Runbooks**: Refer to `docs/runbooks/` for operational procedures
- **Issues**: Search existing issues before creating new ones
- **Team Chat**: Use team communication channels for quick questions

### Contact Information

- **Technical Questions**: Create a GitHub issue with the `question` label
- **Urgent Issues**: Contact the on-call engineer (see runbooks)
- **Process Questions**: Reach out to the project maintainers

## Review Process

### Code Review Checklist

Reviewers should verify:

- [ ] Code follows project standards
- [ ] Tests are adequate and pass
- [ ] Documentation is updated
- [ ] Security implications are considered
- [ ] Performance impact is acceptable
- [ ] Tagging requirements are met (for hotfix/migration-critical PRs)

### Approval Requirements

- **Standard PRs**: 1 approval from team member
- **Hotfix PRs**: 1 approval from team lead or senior engineer
- **Migration-critical PRs**: 2 approvals including 1 from team lead

## Release Process

### Version Tagging

- **Semantic versioning**: Use semantic versioning for releases
- **Release notes**: Include comprehensive release notes
- **Changelog**: Update CHANGELOG.md with each release

### Deployment

- **Staging first**: All changes must be tested in staging
- **Production deployment**: Follow the deployment runbook
- **Monitoring**: Monitor application health post-deployment

---

Thank you for contributing to the Hotel Voice Bot project! Following these guidelines helps ensure code quality, operational stability, and team collaboration.
