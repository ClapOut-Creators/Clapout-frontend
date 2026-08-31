import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';

@Component({
  imports: [ButtonModule, TagModule],
  selector: 'app-foundation-home',
  styleUrl: './foundation-home.css',
  templateUrl: './foundation-home.html',
})
export class FoundationHome {
  protected readonly environment = inject(APP_ENVIRONMENT);
}
