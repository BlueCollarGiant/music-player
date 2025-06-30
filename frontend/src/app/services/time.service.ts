import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimeService {
  private hours = signal(0);
  private minutes = signal(0);
  private seconds = signal(0);
  public duration = signal('0:00:00');

  //-----Methods area-----//

  setHours(value: string): void {
    this.hours.set(+value || 0);
    this.updateDuration();
  }

  setMinutes(value: string): void {
    this.minutes.set(+value || 0);
    this.updateDuration();
  }

  setSeconds(value: string): void {
    this.seconds.set(+value || 0);
    this.updateDuration();
  }

  updateDuration(): void {
    const h = this.hours();
    const m = this.minutes();
    const s = this.seconds();

    const formatted = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    this.duration.set(formatted);
  }

  parseTime(input: string): void {

    const [h, m, s] = input.split(':').map(n => parseInt(n, 10) || 0);
    this.hours.set(h);
    this.minutes.set(m);
    this.seconds.set(s);
    this.updateDuration();
  }

}
