# GitHub Branch Protection Checklist

1. Protect `main` branch.
2. Require pull request reviews.
3. Require status checks:
   - ci / guardrails
   - ci / quality
   - ci / e2e
   - ci / smoke
   - security / secret-scan
   - security / dependency-audit
   - codeql / analyze (python)
   - codeql / analyze (javascript-typescript)
4. Require conversation resolution before merge.
5. Disable force pushes.
