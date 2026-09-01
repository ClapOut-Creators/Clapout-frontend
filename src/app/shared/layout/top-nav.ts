import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Public top bar for anonymous visitors on the discovery pages. Signed-in
 * users get the side nav instead, and auth pages render no shell at all
 * (see App's layout switch).
 */
@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-top-nav',
  templateUrl: './top-nav.html',
})
export class TopNav {}
