# Development server with enhanced CORS handling
# Use this file only for development if you're experiencing CORS issues

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import create_app
from backend.cors_patch import apply_cors_patch

app = create_app()

# Apply the CORS patch (development only)
apply_cors_patch(app)

if __name__ == "__main__":
    print("\n🚀 Starting development server with enhanced CORS handling\n")
    app.run(host='0.0.0.0', port=8000, debug=True)
