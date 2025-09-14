import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: '.',
  base: './',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['axios'],
          
          // Core application chunks
          core: [
            './src/utils/module-loader.js',
            './src/utils/error-handler.js',
            './src/config/config.js',
            './src/state/app-state.js'
          ],
          
          // Services chunk
          services: [
            './src/services/api-service.js'
          ],
          
          // Components chunk
          components: [
            './src/components/Component.js',
            './src/components/Toast.js'
          ],
          
          // Router chunk
          router: [
            './src/router/router.js'
          ]
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? 
            chunkInfo.facadeModuleId.split('/').pop().replace('.js', '') : 
            'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for now
        drop_debugger: true,
        pure_funcs: ['console.debug']
      }
    }
  },
  
  // Development server
  server: {
    port: 5173,
    host: true,
    cors: true,
    hmr: {
      overlay: true
    }
  },
  
  // Preview server (for production builds)
  preview: {
    port: 3000,
    host: true
  },
  
  // Plugin configuration
  plugins: [
    // Legacy browser support
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': './src',
      '@components': './src/components',
      '@services': './src/services',
      '@utils': './src/utils',
      '@config': './src/config',
      '@state': './src/state',
      '@router': './src/router',
      '@screens': './src/screens'
    }
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },
  
  // Environment variables
  envPrefix: 'TAKIPUI_',
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  
  // Optimization
  optimizeDeps: {
    include: ['axios'],
    exclude: ['electron']
  },
  
  // Worker configuration
  worker: {
    format: 'es'
  },
  
  // Experimental features
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `'${filename}'` };
      } else {
        return filename;
      }
    }
  }
});