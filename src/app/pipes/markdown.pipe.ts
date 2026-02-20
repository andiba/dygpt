import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  transform(value: string): SafeHtml {
    if (!value) return '';

    // Handle escaped \n from API responses (literal backslash-n in string)
    const processed = value.replace(/\\n/g, '\n');

    const html = marked.parse(processed) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
