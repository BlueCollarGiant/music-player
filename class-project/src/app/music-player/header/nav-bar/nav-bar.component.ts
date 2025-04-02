// In each component, ensure you have:
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  @Input() activeTab!: string;
  @Output() tabChanged = new EventEmitter<string>();

  tabs: string[] = ['Songs', 'Albums', 'Artists', 'Genres'];

  setActiveTab(tab: string) {
    this.tabChanged.emit(tab);
  }
}
