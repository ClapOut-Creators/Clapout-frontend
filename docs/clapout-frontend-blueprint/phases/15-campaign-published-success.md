# Phase 15 - Campaign Published Success

## Goal

Show clear completion feedback after a campaign is published or submitted according to role permissions.

## Routes / Screens

- Success state after `/admin/campaigns/new` publish.
- Success state after brand submission for review when brand-user flow is active.

## PDF Reference

- Page 26: "Campaign Published!" success confirmation.

## Scope

- Implement success view with view-campaign and back-to-dashboard actions.
- Use role/status-aware copy: admin publish vs brand submit-for-review.
- Preserve analytics event placeholder for `campaign_published` or `campaign_submitted` without sensitive payloads.
- Ensure success state is reachable only after a successful command or valid mock transition.

## Acceptance Criteria

- Success copy matches actual resulting status and does not overpromise creator availability.
- Primary and secondary actions navigate correctly.
- Browser refresh or direct URL access does not fake a successful publish.
- Toast and page success feedback are not duplicative or confusing.

## API Readiness

- Publish/submission result: `MOCKED` unless integrated in Phase 14.

## Responsive And Accessibility Checks

- Check mobile, tablet, laptop, and wide desktop confirmation layout.
- Verify focus lands on the success heading or first meaningful action.
- Run AXE on the success view.

## Handoff Requirements

- Record success routing strategy, status copy, analytics placeholder, and any direct-access behavior.
