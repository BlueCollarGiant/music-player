import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-platform-shell',
  templateUrl: './platform-shell.component.html',
  styleUrls: ['./platform-shell.component.css'],
  imports: [RouterOutlet]
})
export class PlatformShellComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private sub = new Subscription();

  @HostBinding('class') hostClass = 'platform-shell platform--youtube';

  private setClassFromUrl() {
    // read first child segment under /platform/*
    const seg = this.route.firstChild?.snapshot.url[0]?.path?.toLowerCase() || 'youtube';
    const platform =
      seg === 'spotify' ? 'spotify' :
      seg === 'soundcloud' ? 'soundcloud' :
      seg === 'app' ? 'app' : 'youtube';
    this.hostClass = `platform-shell platform--${platform}`;
  }

  ngOnInit() {
    // set once on init
    this.setClassFromUrl();
    // update on navigation end
    this.sub.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => this.setClassFromUrl())
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}