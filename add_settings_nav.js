const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const settingsNav = `                <a href="settings.html" class="nav-item" data-roles="admin,manager">
                    <i class="ph ph-gear"></i>
                    <span>Settings</span>
                </a>
            </nav>`;

files.forEach(file => {
    if (file === 'index.html' || file === 'login.html') return;
    
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('href="settings.html"')) return;
    
    // Replace the closing </nav> with the new item + </nav>
    content = content.replace('            </nav>', settingsNav);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
