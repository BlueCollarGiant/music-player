import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NowPlayingDisplayComponent } from './now-playing-display.component';

describe('NowPlayingDisplayComponent', () => {
  let component: NowPlayingDisplayComponent;
  let fixture: ComponentFixture<NowPlayingDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NowPlayingDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NowPlayingDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
