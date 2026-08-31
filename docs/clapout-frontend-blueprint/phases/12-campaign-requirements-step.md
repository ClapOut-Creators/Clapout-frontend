# Phase 12 - Campaign Requirements Step

## Goal

Capture content requirements and resource links for creators.

## Routes / Screens

- `/admin/campaigns/new` requirements/resources step.
- Edit route reuse when campaign editing is enabled.

## PDF Reference

- Page 23: "Requirement & Resources" step.

## Scope

- Add content requirements textarea and resource link field.
- Validate required content requirements and valid resource URL.
- Support multiple resources only if the confirmed product decision requires it; otherwise implement a single resource link.
- Add preview-safe text handling for campaign preview.
- Correct PDF copy such as "Campaign" and "Requirements and resources."

## Acceptance Criteria

- Long requirement text remains readable and preserved.
- Invalid URLs show accessible field errors.
- Resource link opens safely in a new tab only from preview/detail pages with appropriate rel attributes.
- Back/continue preserves valid state.

## API Readiness

- Requirement/resource draft fields: `MOCKED`.
- Resource upload beyond URL: `BLOCKED` unless backend storage contract exists.

## Responsive And Accessibility Checks

- Check textarea height and action placement on mobile, tablet, laptop, and wide desktop.
- Verify labels, descriptions, errors, and keyboard flow.

## Handoff Requirements

- Record URL policy, resource count decision, and any upload/storage deferrals.
