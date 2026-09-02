# Figma Admin screens — index (design width 1728px)

Each screen has a PNG export (`<file>.png`) and a node spec (`<file>.json`: nested nodes with x,y,w,h relative to the screen, `fill`/`stroke` hex, `r` radius, `lay` auto-layout {d,gap,pad[t,r,b,l],ax,ay}, `fx` effects, and for TEXT: `txt`, `font` "Family Style", `fs` size, `lh` line height, `align`). Use the JSON for exact values, the PNG for the look.

| Figma id | file | what it is |
|---|---|---|
| 160:4030 | dashboard-dashboard-160-4030 | ADMIN DASHBOARD (stat cards, registration activity chart, Need Attention, Recent campaign list, pagination) |
| 189:6413 | brand-brand-189-6413 | BRANDS LIST — "Create Brands" CTA, 3 stat cards, Brand list table (Brand, Email, Industry, Phone, Country, Owner, Status, Action view/delete) |
| 198:7616 | brand-brand-198-7616 | BRANDS LIST variant — "Create campaign" CTA, View/Amount column (verify visually) |
| 198:7908 | brand-campaign-details-198-7908 | BRAND DETAIL — header (logo, name, Active, primary contact, account manager, Pause/Edit), stats (Total campaigns, Registration, Revenue), Campaigns grid w/ search + Create campaign, "Recent Registered" clippers table |
| 198:9032 | brand-campaign-details-198-9032 | BRAND DETAIL → campaign detail view (campaign header inside brand context, performance overview, Registered Clippers) (verify visually) |
| 198:9402 | brand-create-new-campaign-198-9402 | BRAND WIZARD step 1 — "Brand Details": upload logo, Brand name*, Website/social link*, Industry* select, Continue |
| 198:9485 | brand-campaign-details-198-9485 | BRAND WIZARD step 2 — "Brand Location": Country*, City*, Back/Continue |
| 198:9539 | brand-campaign-budget-198-9539 | BRAND WIZARD step 3 — "Primary Contact": Contact name*, Business email*, Phone number*, Back/Continue |
| 198:10001 | brand-complete-198-10001 | BRAND WIZARD done — "Brand Saved!" success (View brand / Back to Dashboard) |
| 176:4073 | campaign-and-create-campaign-details-176-4073 | ADMIN CAMPAIGN DETAIL — with Registered Clippers table (Clippers, Email, WhatsApp, Phone, Social, Payment, View/Amount) + Export |
| 181:5913 | campaign-and-create-campaign-details-no-clippers-181-5913 | ADMIN CAMPAIGN DETAIL — REJECTED state: "Documentation incomplete" banner, Resubmit/Edit, empty "No registration yet" |
| 176:4993 | campaign-and-create-dashboard-176-4993 | ADMIN CAMPAIGN DETAIL — with "Process creator payout" popover (view rate, verified views, calculation) — popover OUT OF SCOPE, style only |
| 181:5508 | campaign-and-create-campaign-details-181-5508 | ADMIN CAMPAIGN DETAIL variant (verify visually vs 176:4073) |
| 172:823 | campaign-and-create-create-new-campaign-172-823 | CAMPAIGN WIZARD step 1 — "Create New Campaign": Campaign banner upload + Title* |
| 172:1211 | campaign-and-create-campaign-details-172-1211 | CAMPAIGN WIZARD step 2 — "Campaign Details": Short description*, Category*, Product* |
| 172:1549 | campaign-and-create-campaign-budget-172-1549 | CAMPAIGN WIZARD step 3 — "Campaign Budget": Currency*, Campaign budget*, Rate*, Views* |
| 172:2146 | campaign-and-create-campaign-timeline-172-2146 | CAMPAIGN WIZARD step 4 — "Campaign Timeline": range calendar |
| 172:3073 | campaign-and-create-campaign-platforms-172-3073 | CAMPAIGN WIZARD step 5 — "Campaign Platforms": TikTok/Instagram/Facebook/YouTube Reel checkbox rows |
| 172:3572 | campaign-and-create-requirement-resources-172-3572 | CAMPAIGN WIZARD step 6 — "Requirement & Resources": Content Requirement*, Resource Link |
| 173:4482 | campaign-and-create-campaign-detail-173-4482 | CAMPAIGN WIZARD step 7 — "Campaign - Detail" PREVIEW (public-style detail) with Edit / Save Draft / Publish |
| 176:1056 | campaign-and-create-complete-176-1056 | CAMPAIGN WIZARD done — "Campaign Published!" (View Campaign / Back to Dashboard) |
| 179:362 | campaign-and-create-empty-state-dashboard-179-362 | CAMPAIGNS — EMPTY STATE ("No campaigns yet", Create Campaign) |
| 176:3357 | campaign-and-create-campaigns-176-3357 | CAMPAIGNS LIST — status tabs (All/Awaiting review/Rejected/Active), search, campaign card grid |
| 176:1195 | campaign-and-create-campaigns-awaiting-176-1195 | CAMPAIGNS LIST — "Awaiting review" tab selected (cards with Awaiting review tags) |
| 147:3105 | login-sign-147-3105 | LOGIN / SIGN-IN screen |
| 338:955 | campaign-card-compact-338-955 | COMPONENT: Campaign Card — Compact (the card used in grids) |

# Global tokens (from the whole Admin page)

## Fonts (by usage)
- SF Pro: 709 text nodes
- Poppins: 475 text nodes
- Inter: 80 text nodes
- Lato: 58 text nodes
- Open Sans: 3 text nodes

Rule: **Poppins** for headings/titles/labels-with-emphasis, **SF Pro** (system stack `-apple-system, "SF Pro Text", "Helvetica Neue", "Segoe UI", sans-serif`) for body/table text. Treat Inter/Lato/Open Sans occurrences as design inconsistencies → map to SF Pro (or Poppins when the node is a heading).

## Solid colors (fill / stroke, by usage)
- #FFFFFF ×341
- #1A1A1A ×197
- #444444 ×168
- #FFFFFF (stroke) ×150
- #171A1C ×144
- #000000 ×125
- #464646 (stroke) ×121
- #EC612C ×74
- #151515 ×73
- #464646 ×67
- #1E293B ×59
- #7B7B7B ×55
- #ECECEC (stroke) ×46
- #DDDDDD (stroke) ×46
- #EEEEEE (stroke) ×45
- #015AF4 ×42
- #666666 ×42
- #E60000 (stroke) ×42
- #A6A6A6 ×42
- #F9F9F9 ×40
- #F8F8F8 ×39
- #333333 ×37
- #5E5E5E ×36
- #F7F7F7 ×31
- #DFDFDF ×29
- #D7D7D7 (stroke) ×27
- #ECECEC ×26
- #525252 ×25
- #585858 (stroke) ×24
- #DCDCDC (stroke) ×24
- #0C0C0C ×24
- #383838 ×22
- #F1F1F1 (stroke) ×21
- #FFC93C ×21
- #D00000 ×20
- #969696 ×20
- #EAEAEA ×20
- #D5D5D5 (stroke) ×18
- #616161 ×18
- #E0E0E0 ×18
- #808080 ×16
- #009100 ×16
- #E1FFE1 ×15
- #16AC20 ×15
- #FFE1E1 ×14
- #574808 ×14
- #6F6F6F ×14
- #8A8A8A ×14
- #7F7F7F ×14
- #F1F1F1 ×13
- #272727 ×13
- #F26522 ×13
- #BFBFBF ×12
- #C8FFC8 ×12
- #CDCDCD ×12
- #393939 ×12
- #F5F5F5 (stroke) ×9
- #DADADA (stroke) ×9
- #FFDAC0 ×8
- #F5622A ×8

## Text styles (Family Style size / line-height, by usage)
- SF Pro Regular 16 ×352
- Poppins Regular 14.446349143981934 / lh 17.07295799255371 ×78
- SF Pro Regular 18 ×50
- SF Pro Medium 17.48658561706543 ×50
- SF Pro Regular 20 ×36
- Poppins SemiBold 18.386262893676758 / lh 17.07295799255371 ×36
- Poppins Medium 11.819741249084473 / lh 17.07295799255371 ×36
- Inter Regular 22.02730369567871 / lh 31.467575073242188 ×35
- Inter Regular 18.88054656982422 / lh 25.174060821533203 ×31
- SF Pro Semibold 16 ×29
- Lato Medium 18 / lh 23.775955200195312 ×27
- Poppins Regular 13.088133811950684 / lh 11.222782135009766 ×25
- SF Pro Regular 14 ×22
- Poppins SemiBold 20 ×21
- SF Pro Medium 20 ×21
- Poppins Regular 15.800000190734863 / lh 13.548145294189453 ×20
- SF Pro Semibold 22 ×20
- Poppins Regular 13.133044242858887 / lh 17.07295799255371 ×18
- Poppins SemiBold 24.952783584594727 / lh 17.07295799255371 ×18
- SF Pro Medium 22.956520080566406 / lh 38.260868072509766 ×18
- Lato Medium 12 ×16
- SF Pro Regular 17.48658561706543 ×15
- Poppins Regular 14 / lh 23.775955200195312 ×15
- Poppins Regular 16 ×15
- Poppins SemiBold 25 ×14
- SF Pro Medium 7.702203273773193 / lh 12.837005615234375 ×14
- Poppins SemiBold 30 ×12
- SF Pro Bold 22 ×12
- Poppins SemiBold 13 ×12
- SF Pro Semibold 17.48658561706543 ×11
- Lato Medium 18 ×11
- SF Pro Regular 18 / lh 26 ×11
- SF Pro Regular 22 ×11
- Poppins Regular 18 ×10
- Poppins Regular 38.84220504760742 / lh 33.30632400512695 ×10
- Poppins Regular 9.539534568786621 / lh 11.222782135009766 ×10
- Poppins Medium 18 / lh 13.548145294189453 ×10
- Poppins Regular 8.773737907409668 / lh 7.523283958435059 ×10
- Poppins SemiBold 14 ×9
- Poppins SemiBold 40 ×9
- Inter Semi Bold 11 ×8
- Poppins Medium 13.133044242858887 / lh 17.07295799255371 ×8
- Poppins Regular 14.434213638305664 / lh 12.377015113830566 ×7
- Poppins Medium 38 ×6
- Poppins SemiBold 22 ×6
- SF Pro Medium 9.756123542785645 / lh 16.26020622253418 ×5
- Poppins Medium 18 / lh 23.775955200195312 ×5
- Poppins Regular 18 / lh 23.775955200195312 ×5
- Poppins Regular 11.583721160888672 ×5
- Poppins SemiBold 24 ×5
- SF Pro Medium 18 / lh 24 ×5
- SF Pro Medium 16 ×4
- Lato Medium 20 ×4
- SF Pro Regular 24 ×4
- Poppins Regular 26.038188934326172 / lh 22.327163696289062 ×4
- Poppins Regular 6.394905090332031 / lh 7.523283958435059 ×4
- SF Pro Semibold 35.65012741088867 / lh 59.41687774658203 ×3
- Poppins SemiBold 22 / lh 17.07295799255371 ×3
- Poppins Regular 16 / lh 17.07295799255371 ×3
- Open Sans SemiBold 13 ×3

## Corner radii (by usage)
- 10px ×130
- 8px ×118
- 12px ×79
- 26.266088485717773px ×47
- 2px ×40
- 12.587030410766602px ×39
- 4px ×32
- 30px ×32
- 28px ×29
- 5.38048791885376px ×24
- 6.293515205383301px ×24
- 18.831707000732422px ×23
- 13.133044242858887px ×21
- 19.699565887451172px ×21
- 39.399131774902344px ×21
- 1.5px ×15
- 13.627906799316406px ×15
- 16px ×14
- 40px ×13
- 5px ×12
- 20px ×12
- 26px ×12
- 60px ×12
- 12.106098175048828px ×11
- 9.44027328491211px ×9
- 19.079069137573242px ×8
- 29.530221939086914px ×8
- 27.406736373901367px ×8
- 1px ×7
- 9.135579109191895px ×7
- 9.903607368469238px ×5
- 81.76744079589844px ×5
- 8.17674446105957px ×5
- 40.88372039794922px ×5
- 15.632474899291992px ×5
- 31.264949798583984px ×5
- 18px ×4
- 42.4870491027832px ×4
- 24px ×2
- 50px ×2
- 100px ×2
- 25.579620361328125px ×2
- 54.813472747802734px ×2
- 5.48134708404541px ×2
- 18.27115821838379px ×2
- 15px ×1
- 22px ×1
- 10.76097583770752px ×1
- 55.38461685180664px ×1
- 48.87323760986328px ×1
- 18.88054656982422px ×1
- 14.281169891357422px ×1
- 28.562339782714844px ×1
