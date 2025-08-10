/**
 * HTML Renderer for AI-generated content
 * Converts structured JSON to SEO-optimized HTML with schema markup
 */
class HTMLRenderer {
  render(content) {
    try {
      const html = this.generateHTML(content);
      return {
        html: html,
        fullPage: this.generateFullPage(content, html)
      };
    } catch (error) {
      console.error('HTML rendering error:', error);
      throw new Error('Failed to render HTML content');
    }
  }

  generateHTML(content) {
    let html = '';

    // Main H1
    if (content.h1) {
      html += `<h1 class="text-4xl font-bold text-gray-900 mb-6">${this.escapeHtml(content.h1)}</h1>`;
    }

    // Introduction
    if (content.intro) {
      html += `<div class="intro mb-8">`;
      html += `<p class="text-xl text-gray-700 leading-relaxed">${this.escapeHtml(content.intro)}</p>`;
      html += `</div>`;
    }

    // Sections
    if (content.sections && Array.isArray(content.sections)) {
      content.sections.forEach((section, index) => {
        html += this.renderSection(section, index);
      });
    }

    // FAQs
    if (content.faqs && Array.isArray(content.faqs)) {
      html += this.renderFAQs(content.faqs);
    }

    return html;
  }

  renderSection(section, index) {
    let html = `<section class="mb-12" id="section-${index + 1}">`;
    
    // H2 heading
    if (section.h2) {
      html += `<h2 class="text-2xl font-semibold text-gray-900 mb-4">${this.escapeHtml(section.h2)}</h2>`;
    }

    // Paragraphs
    if (section.paragraphs && Array.isArray(section.paragraphs)) {
      section.paragraphs.forEach((paragraph, pIndex) => {
        html += `<p class="text-gray-700 mb-4 leading-relaxed">${this.escapeHtml(paragraph)}</p>`;
      });
    }

    // Bullet points
    if (section.bullets && Array.isArray(section.bullets)) {
      html += `<ul class="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-6">`;
      section.bullets.forEach((bullet, bIndex) => {
        html += `<li>${this.escapeHtml(bullet)}</li>`;
      });
      html += `</ul>`;
    }

    html += `</section>`;
    return html;
  }

  renderFAQs(faqs) {
    let html = `<section class="faqs mt-12 pt-8 border-t border-gray-200">`;
    html += `<h2 class="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>`;
    
    html += `<div class="space-y-4">`;
    faqs.forEach((faq, index) => {
      html += `<div class="faq-item border border-gray-200 rounded-lg p-4">`;
      html += `<h3 class="font-semibold text-gray-900 mb-2">${this.escapeHtml(faq.question)}</h3>`;
      html += `<p class="text-gray-700">${this.escapeHtml(faq.answer)}</p>`;
      html += `</div>`;
    });
    html += `</div>`;
    
    html += `</section>`;
    return html;
  }

  generateSchema(content) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": content.h1,
      "description": content.intro,
      "articleBody": this.generateHTML(content),
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "author": {
        "@type": "Organization",
        "name": "AI Content Generator"
      },
      "publisher": {
        "@type": "Organization",
        "name": "AI Content Generator"
      }
    };

    // Add FAQ schema if FAQs exist
    if (content.faqs && content.faqs.length > 0) {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": content.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      };
      
      return [schema, faqSchema];
    }

    return [schema];
  }

  generateFullPage(content, htmlContent) {
    const schemas = this.generateSchema(content);
    const schemaScripts = schemas.map(schema => 
      `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
    ).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(content.h1)}</title>
    <meta name="description" content="${this.escapeHtml(content.intro)}">
    <meta name="keywords" content="${this.escapeHtml(content.h1.toLowerCase().replace(/\s+/g, ', '))}">
    <meta name="author" content="AI Content Generator">
    <meta property="og:title" content="${this.escapeHtml(content.h1)}">
    <meta property="og:description" content="${this.escapeHtml(content.intro)}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${this.escapeHtml(content.h1)}">
    <meta name="twitter:description" content="${this.escapeHtml(content.intro)}">
    ${schemaScripts}
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #1f2937; margin-bottom: 1.5rem; }
        h2 { color: #374151; margin-top: 2rem; margin-bottom: 1rem; }
        p { margin-bottom: 1rem; }
        ul { margin-bottom: 1.5rem; }
        li { margin-bottom: 0.5rem; }
        .faq-item { background: #f9fafb; }
        .intro { font-size: 1.125rem; color: #4b5563; }
    </style>
</head>
<body>
    <article>
        ${htmlContent}
    </article>
</body>
</html>`;
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }
}

module.exports = { HTMLRenderer };
