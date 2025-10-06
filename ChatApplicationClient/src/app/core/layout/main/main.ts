import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Friends } from '../../features/friends/friends';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterModule, Sidebar, Friends],
  templateUrl: './main.html',
  styleUrls: ['./main.scss']
})
export class Main {
  // Main artık sadece layout'u yönetiyor
  // Tüm fonksiyonlar ilgili bileşenlere taşındı
}
