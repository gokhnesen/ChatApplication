import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'profilePhoto',
  standalone: true
})
export class ProfilePhotoPipe implements PipeTransform {
  private readonly baseUrl = environment.apiUrl.replace('/api', '');

  transform(url: string | null | undefined): string {
    if (!url || url.trim() === '') {
      return 'assets/default-avatar.png';
    }
    
    if (url.startsWith('http')) {
      return url;
    }
    
    return `${this.baseUrl}${url}`;
  }
}