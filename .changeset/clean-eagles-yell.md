---
'tinacms': patch
---

Removes the @tinacms/search dependency from tinacms given that uses sqlite-level, which in turn depends on the better-sqlite3 package that is breaking the builds on Build Cloud / Ripple CI: https://github.com/teambit/bit/issues/8628
