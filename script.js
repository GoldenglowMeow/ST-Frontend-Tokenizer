(async function() {
    if (document.readyState === 'loading') {
        await new Promise(resolve => window.addEventListener('load', resolve));
    }

    console.log('[Frontend Tokenizer] Plugin loading...');

    try {
        const $ = window.jQuery;
        const toastr = window.toastr;

        if (!$) {
            throw new Error('jQuery not found on the window object. The plugin cannot be loaded.');
        }
        if (!toastr) {
            console.warn('[Frontend Tokenizer] toastr not found on the window object. UI notifications will be disabled.');
        }

        const originalJQueryAjax = $.ajax;

        function estimateTokens(text) {
            if (typeof text !== 'string' || !text.length) {
                return 0;
            }
            let bytes = 0;
            for (let i = 0; i < text.length; i++) {
                const codePoint = text.codePointAt(i);
                if (codePoint <= 0x7F) {
                    bytes += 1;
                } else if (codePoint <= 0x7FF) {
                    bytes += 2;
                } else if (codePoint <= 0xFFFF) {
                    bytes += 3;
                } else {
                    bytes += 4;
                    i++;
                }
            }

            return Math.ceil(bytes / 3.75) + 1;
        }

        $.ajax = function(options) {
            const isTokenizerRequest = options.url && options.url.startsWith('/api/tokenizers/');

            if (isTokenizerRequest) {
                console.log('[Frontend Tokenizer] Intercepted a tokenizer request to:', options.url);

                let totalTokens = 0;
                try {
                    const data = JSON.parse(options.data);

                    if (Array.isArray(data)) {
                        for (const message of data) {
                            const content = typeof message === 'string' ? message : message.content || '';
                            totalTokens += estimateTokens(content);
                        }
                    } else if (data && typeof data.text === 'string') {
                        totalTokens += estimateTokens(data.text);
                    }

                } catch (e) {
                    console.error('[Frontend Tokenizer] Error parsing request data:', e);
                    return originalJQueryAjax.apply(this, arguments);
                }

                console.log(`[Frontend Tokenizer] Estimated tokens: ${totalTokens}. Returning mocked response.`);

                const deferred = $.Deferred();
                const responseData = { count: totalTokens, token_count: totalTokens, ids: [] };
                deferred.resolve(responseData);
                
                if (options.success) {
                    options.success(responseData);
                }

                return deferred.promise();
            }

            return originalJQueryAjax.apply(this, arguments);
        };

        console.log('[Frontend Tokenizer] Successfully patched jQuery.ajax. Enjoy the speed!');
    } catch (error) {
        console.error('[Frontend Tokenizer] Failed to load or patch:', error);
        const toastr = window.toastr;
        if (toastr) {
            toastr.error('Frontend Tokenizer应用失败', 'Frontend Tokenizer');
        }
    }
})();