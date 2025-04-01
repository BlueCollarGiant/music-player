import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-tab-menu',
  imports: [CommonModule],
  templateUrl: './tab-menu.component.html',
  styleUrl: './tab-menu.component.css'
})
export class TabMenuComponent {
setActiveTab(_t4: string) {
throw new Error('Method not implemented.');
}
  @Input() tabs: string[] = [];
  @Input() activeTab: string = '';
  @Output() tabChange = new EventEmitter<string>();

  setTab(tab: string) {
    this.tabChange.emit(tab);
  }
}
