import { Injectable } from "@angular/core";


@Injectable({ providedIn: 'root' })
export class ThemeService {
    private current?: string;
    private readonly all = ['youtube', 'spotify', 'soundcloud', 'app'];

     setPlatformTheme(platform: string) {
    if (this.current === platform) return;
    const body = document.body;
    if (this.current) body.classList.remove(`theme--${this.current}`);
    this.all.forEach(p => body.classList.remove(`theme--${p}`));
    body.classList.add(`theme--${platform}`);
    this.current = platform;
  }
}
