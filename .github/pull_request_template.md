## Pull Request Summary

<!-- Brief description of the changes made -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Infrastructure/deployment change
- [ ] Hot-patch/emergency fix

## Changes Made

<!-- List the specific changes made in this PR -->

- 
- 
- 

## Testing

<!-- Describe the tests that ran to verify your changes -->

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance testing (if applicable)

## Checklist

### General
- [ ] My code follows the project's code style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

### Documentation Updates (if applicable)
- [ ] API documentation updated (if API changes were made)
- [ ] README updated (if setup/usage changed)
- [ ] Runbook documentation updated (if operational procedures changed)

### Operations Documentation Updates ⚠️
**If this PR touches deployment, runbook, or migration documentation:**

- [ ] I have reviewed the "Known Issues/Caveats" section in relevant docs
- [ ] I have added any newly discovered edge cases to the Known Issues section
- [ ] I have created a [Known Issues ticket](.github/ISSUE_TEMPLATE/known_issues.md) for any significant operational caveats
- [ ] I have updated workarounds or mitigation strategies if they changed

**Specific docs that may need Known Issues updates:**
- [ ] `docs/runbooks/deployment.md` - For deployment-related changes
- [ ] `docs/runbooks/rollback.md` - For rollback procedure changes  
- [ ] `docs/runbooks/hot-patch.md` - For hot-patch procedure changes
- [ ] `DEPLOYMENT.md` - For infrastructure/deployment changes
- [ ] Migration scripts - For database migration changes

### Security
- [ ] I have checked for potential security vulnerabilities
- [ ] Secrets are properly managed and not hardcoded
- [ ] API endpoints are properly authenticated/authorized (if applicable)

### Database Changes (if applicable)
- [ ] Migration scripts are additive (no dropping/modifying existing tables)
- [ ] Migration scripts have been tested on staging
- [ ] Database backup procedures are documented
- [ ] RLS policies are properly configured

### Deployment/Infrastructure Changes (if applicable)
- [ ] Changes have been tested in staging environment
- [ ] Monitoring and alerting are configured for new components
- [ ] Rollback procedures are documented
- [ ] Performance impact has been assessed

## Related Issues

<!-- Link any related issues -->
Closes #
References #

## Deployment Notes

<!-- Any special deployment considerations, order of operations, etc. -->

## Risk Assessment

<!-- Assess the risk level of this change -->

- **Risk Level**: Low/Medium/High
- **Reason**: 
- **Mitigation**: 

## Screenshots/Recordings (if applicable)

<!-- Add screenshots for UI changes or recordings for complex workflows -->

## Additional Context

<!-- Any additional context, background information, or notes for reviewers -->

---

### For Reviewers

**Please verify:**
- [ ] Code quality and adherence to standards
- [ ] Test coverage is adequate
- [ ] Documentation is updated appropriately
- [ ] Known Issues/Caveats are documented (for ops changes)
- [ ] Security implications have been considered
- [ ] Performance impact is acceptable
