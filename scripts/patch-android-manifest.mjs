/* CIで生成される AndroidManifest.xml に「共有（ACTION_SEND）」の受け取り設定を追加する。
 * android/ はビルドのたびに `cap add android` で生成されるため、生成後にこのスクリプトで追記する。
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const path = 'android/app/src/main/AndroidManifest.xml';

if (!existsSync(path)) {
  console.error(`AndroidManifest not found at ${path}`);
  process.exit(1);
}

let xml = readFileSync(path, 'utf8');

if (xml.includes('android.intent.action.SEND')) {
  console.log('AndroidManifest already has a SEND intent-filter — skipping.');
  process.exit(0);
}

const filter = `
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>`;

// MainActivity の最初の </intent-filter>（MAIN/LAUNCHER）の直後に追記する
const marker = '</intent-filter>';
const idx = xml.indexOf(marker);
if (idx === -1) {
  console.error('No <intent-filter> found in AndroidManifest — cannot patch.');
  process.exit(1);
}

const insertAt = idx + marker.length;
xml = xml.slice(0, insertAt) + filter + xml.slice(insertAt);
writeFileSync(path, xml);
console.log('Patched AndroidManifest with a text/plain SEND intent-filter.');
