import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Chat } from "./core/features/chat/chat";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Chat],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected title = 'ChatApplicationClient';
}
