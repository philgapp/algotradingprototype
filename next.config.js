module.exports = {
    webpack: (config, options) => {
        config.node = {
            // These 3 options were required to resolve errors loading alpacapaper.js
            fs: 'empty',
            net: 'empty',
            tls: 'empty',
        }

        return config
    },
}