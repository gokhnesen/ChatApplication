import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'attachFile',
  standalone: true
})
export class AttachFilePipe implements PipeTransform {
  private readonly baseUrl = environment.apiUrl.replace('/api', '');
  
  transform(
    value: number | string | null | undefined, 
    type: 'size' | 'url' = 'size',
    decimals: number = 2
  ): string {
    
    if (type === 'url') {
      return this.transformUrl(value as string);
    }
    
    return this.transformSize(value as number, decimals);
  }

  private transformSize(bytes: number | null | undefined, decimals: number): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private transformUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${this.baseUrl}${url}`;
  }
}
