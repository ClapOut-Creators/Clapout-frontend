# Figma "Web App - clippers" page — screens (design width 1728 desktop, 402/380 mobile)

Same format as `../figma/_README.md`: `<file>.png` is the 1:1 export, `<file>.json` the node spec
(x,y,w,h relative to the screen, fill/stroke hex, radius, auto-layout, text font/size/line-height).

| Figma id | file | what it is |
|---|---|---|
| 344:1182 | campaigns-list-desktop-344-1182 | PUBLIC CAMPAIGNS LIST — desktop (signed-out default page, with footer) |
| 344:1295 | campaigns-list-mobile-344-1295 | PUBLIC CAMPAIGNS LIST — mobile (402px) |
| 344:2763 | campaign-details-desktop-344-2763 | PUBLIC CAMPAIGN DETAIL — desktop (header, content, footer) |
| 344:2929 | campaign-details-mobile-380-344-2929 | PUBLIC CAMPAIGN DETAIL — mobile (380px) |
| 353:184 | campaign-details-mobile-402-353-184 | (empty export — ignore) |
| 349:3128 | sign-a-349-3128 | SIGN screen A |
| 349:3159 | sign-b-349-3159 | SIGN screen B |
| 349:3267 | clipper-dashboard-349-3267 | CLIPPER (creator) DASHBOARD — empty state |

Added 2026-09-03 (the "Clipper" section grew 20 frames):

| Figma id | file | what it is |
|---|---|---|
| 380:844 | dashboard-data-desktop-380-844 | CLIPPER DASHBOARD with data (stats + a joined campaign) — desktop |
| 397:2720 | dashboard-data-mobile-397-2720 | CLIPPER DASHBOARD with data — mobile (402), bottom tab bar |
| 366:376 | dashboard-mobile-366-376 | CLIPPER DASHBOARD empty — mobile (402), bottom tab bar |
| 397:3135 | clipping-details-desktop-397-3135 | SIGNED-IN CAMPAIGN PAGE ("Clipping details"), Detail tab — desktop |
| 398:4552 | clipping-details-mobile-398-4552 | SIGNED-IN CAMPAIGN PAGE, Detail tab — mobile |
| 398:6785 | clipping-leaderboard-desktop-398-6785 | SIGNED-IN CAMPAIGN PAGE, Leaderboard tab ("Top earners") — desktop |
| 398:6940 | clipping-leaderboard-mobile-398-6940 | SIGNED-IN CAMPAIGN PAGE, Leaderboard tab — mobile |
| 398:5569 | submit-post-1-desktop-398-5569 | SUBMIT FLOW step 1 "Submit Post link" (overlay) — desktop |
| 402:7789 | submit-screenshot-desktop-402-7789 | SUBMIT FLOW step 2 "Upload Screenshot" — desktop |
| 402:8770 | submit-post-3-desktop-402-8770 | SUBMIT FLOW step 3 "Payment preferences" (add method button) — desktop |
| 402:8276 | submit-post-4-desktop-402-8276 | SUBMIT FLOW step 4 "Payment preferences" (network + account) — desktop |
| 398:6048 | submit-success-desktop-398-6048 | SUBMIT FLOW "Successful" — desktop |
| 398:5724 | submit-post-1-mobile-398-5724 | SUBMIT FLOW step 1 — mobile |
| 402:7975 | submit-post-2-mobile-402-7975 | SUBMIT FLOW step 2 — mobile |
| 402:8964 | submit-post-3-mobile-402-8964 | SUBMIT FLOW step 3 — mobile |
| 402:8462 | submit-post-4-mobile-402-8462 | SUBMIT FLOW step 4 — mobile |
| 398:6238 | submit-success-mobile-398-6238 | SUBMIT FLOW "Successful" — mobile |
| 397:1535 | add-social-desktop-397-1535 | ADD SOCIAL ACCOUNT overlay — desktop |
| 378:640 | add-social-mobile-378-640 | ADD SOCIAL ACCOUNT overlay — mobile |
| 366:324 | create-account-mobile-366-324 | CREATE ACCOUNT (sign-up) — mobile |

The overlay frames (submit flow, add social) are modals drawn over the page behind them
(heavy backdrop blur, × top right, 506px centred column). What the platform builds from
each is written up in `docs/INTEGRATION-PLAN.md` → "Clipper portal screens".
