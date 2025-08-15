import { Injectable, signal, effect, isDevMode } from '@angular/core';

export type SupportedPlatform = 'youtube' | 'spotify' | 'soundcloud';

@Injectable({ providedIn: 'root' })
export class PlatformStateService {
	current = signal<SupportedPlatform>('youtube');

	constructor() {
		effect(() => {
			const p = this.current();
			// apply a body class as a safety fallback in case host bindings fail somewhere
			const clsPrefix = 'platform--';
			document.body.classList.forEach(c => {
				if (c.startsWith(clsPrefix)) document.body.classList.remove(c);
			});
			document.body.classList.add(`${clsPrefix}${p}`);
			if (isDevMode()) {
				// eslint-disable-next-line no-console
				console.debug('[PlatformState] applied', p);
			}
		});
	}

	set(p: SupportedPlatform) { this.current.set(p); }
}
