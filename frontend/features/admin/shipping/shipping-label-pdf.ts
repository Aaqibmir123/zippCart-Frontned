import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import type { ShippingLabel } from './admin-shipping-api';
import { labelHtml } from './shipping-label-html';

export async function createShareableLabelPdf(label: ShippingLabel, qrBase64: string): Promise<string> {
  const result = await Print.printToFileAsync({
    html: labelHtml(label, qrBase64), width: 595, height: 842, base64: true,
  });
  if (!result.base64) throw new Error('The PDF could not be generated. Please try again.');

  // Expo Go may deny Sharing access to Print's output directory. Write the
  // returned PDF bytes into this app's permitted cache, without reading that URI.
  const reference = label.reference.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const file = new File(Paths.cache, `ZippCart-${reference}-${Date.now()}.pdf`);
  file.create({ overwrite: true });
  file.write(result.base64, { encoding: 'base64' });
  if (!file.exists || file.size === 0) throw new Error('Could not save the PDF for sharing. Please try again.');
  // Keep the cached file after opening the sheet: recipient apps may read later.
  return file.uri;
}
