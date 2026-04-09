import JSZip from 'jszip';

export interface ParsedBook {
  text: string;
  title: string;
  coverUrl: string | null;
}

export const parseEpub = async (file: File): Promise<ParsedBook> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  // 1. Find META-INF/container.xml to locate the OPF file
  const containerFile = loadedZip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Invalid EPUB: Missing container.xml');
  
  const containerXml = await containerFile.async('string');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  if (!containerDoc) throw new Error('Invalid EPUB: Failed to parse container.xml');

  const rootfile = containerDoc.getElementsByTagName('rootfile')[0];
  if (!rootfile) throw new Error('Invalid EPUB: Missing rootfile in container');
  
  const fullPath = rootfile.getAttribute('full-path');
  if (!fullPath) throw new Error('Invalid EPUB: Missing OPF path');

  // 2. Read the OPF file (Content.opf)
  const opfFile = loadedZip.file(fullPath);
  if (!opfFile) throw new Error(`Invalid EPUB: OPF file not found at ${fullPath}`);
  
  const opfXml = await opfFile.async('string');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');
  if (!opfDoc) throw new Error('Invalid EPUB: Failed to parse OPF file');

  // 3. Parse Metadata for Title
  const metadata = opfDoc.getElementsByTagName('metadata')[0];
  const titleEl = metadata?.getElementsByTagName('dc:title')[0] || metadata?.getElementsByTagName('title')[0];
  const title = titleEl?.textContent || file.name.replace('.epub', '');

  // 4. Parse Manifest (ID -> Href) and Spine (Order of IDs)
  const manifestItems = Array.from(opfDoc.getElementsByTagName('item'));
  const manifest: Record<string, string> = {};
  manifestItems.forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest[id] = href;
  });

  const spineItems = Array.from(opfDoc.getElementsByTagName('itemref'));
  const spineIds = spineItems.map(item => item.getAttribute('idref')).filter((id): id is string => !!id);

  const opfFolder = fullPath.substring(0, fullPath.lastIndexOf('/'));

  // 5. Extract Cover Image
  let coverHref = '';
  
  // Method A: Check for 'properties="cover-image"' (EPUB 3)
  const coverItem = manifestItems.find(item => item.getAttribute('properties')?.includes('cover-image'));
  if (coverItem) {
    coverHref = coverItem.getAttribute('href') || '';
  }

  // Method B: Check for <meta name="cover" content="item-id" /> (EPUB 2)
  if (!coverHref) {
    const metaCover = Array.from(opfDoc.getElementsByTagName('meta')).find(m => m.getAttribute('name') === 'cover');
    const coverId = metaCover?.getAttribute('content');
    if (coverId && manifest[coverId]) {
      coverHref = manifest[coverId];
    }
  }

  // Method C: Fallback search for ID containing 'cover'
  if (!coverHref) {
    const fallbackId = Object.keys(manifest).find(id => id.toLowerCase().includes('cover') && /\.(jpg|jpeg|png)$/i.test(manifest[id]));
    if (fallbackId) coverHref = manifest[fallbackId];
  }

  let coverUrl: string | null = null;
  if (coverHref) {
    const imagePath = opfFolder ? `${opfFolder}/${coverHref}` : coverHref;
    const imgFile = loadedZip.file(imagePath);
    if (imgFile) {
      const blob = await imgFile.async('blob');
      coverUrl = URL.createObjectURL(blob);
    }
  }

  // 6. Extract Text content from Spine
  const textParts: string[] = [];

  for (const id of spineIds) {
    const href = manifest[id];
    if (!href) continue;

    // Only process HTML/XHTML files
    if (!href.match(/\.(html|xhtml|htm)$/i)) continue;

    const filePath = opfFolder ? `${opfFolder}/${href}` : href;
    const contentFile = loadedZip.file(filePath);
    
    if (contentFile) {
      const contentHtml = await contentFile.async('string');
      const doc = parser.parseFromString(contentHtml, 'application/xhtml+xml');
      
      // Safety check: doc.body might be null if parsing failed or XML is invalid
      if (doc && doc.body) {
        const text = extractTextFromNode(doc.body);
        if (text) textParts.push(text);
      }
    }
  }

  return { 
    text: textParts.join('\n\n'), 
    title, 
    coverUrl 
  };
};

const extractTextFromNode = (node: Node | null): string => {
  if (!node) return '';

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'script' || tagName === 'style') return '';

    let text = '';
    const childNodes = node.childNodes;
    if (childNodes) {
      for (let i = 0; i < childNodes.length; i++) {
        text += extractTextFromNode(childNodes[i]);
      }
    }

    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'li'].includes(tagName)) {
      return `\n${text}\n`;
    }
    return text;
  }
  
  return '';
};

export const estimateTokens = (text: string): number => {
  // Rough approximation: 1 token ~= 4 chars
  return Math.ceil(text.length / 4);
};