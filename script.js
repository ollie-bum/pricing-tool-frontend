// script.js
document.addEventListener('DOMContentLoaded', function () {
    // Get elements for single item form (index.html)
    const pricingForm = document.getElementById('pricingForm');
    const bulkForm = document.getElementById('bulkForm');
    const submitButton = document.getElementById('submitButton');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const resultsElement = document.getElementById('results');

    // Debug form detection
    console.log('pricingForm:', pricingForm);
    console.log('bulkForm:', bulkForm);

    // API endpoint
    const API_BASE = 'https://pricing-tool-tblw.onrender.com/';
    const API_ENDPOINT = `${API_BASE}/api/price`;
    const BULK_API_ENDPOINT = `${API_BASE}/api/bulk_price`;

    // Format currency
    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    // Format time range
    function formatTimeRange(min, max, unit) {
        if (min === max) {
            return `${min} ${unit}${min !== 1 ? 's' : ''}`;
        } else {
            return `${min}-${max} ${unit}s`;
        }
    }

    // Define the getModelDisplayName
    function getModelDisplayName(modelId) {
        const displayNames = {
            claude: "Claude (Anthropic)",
            gemini: "Gemini (Google)",
            grok: "Grok (xAI)"
        };
        return displayNames[modelId] || modelId;
    }

    // Handle single item form submission (index.html)
    if (pricingForm) {
        console.log('Setting up pricingForm event listener');
        // Check for available models
        fetchAvailableModels();

        pricingForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get form values
            const brand = document.getElementById('brand').value;
            const model = document.getElementById('model').value;
            const condition = document.getElementById('condition').value;
            const additionalDetails = document.getElementById('additionalDetails').value;

            // Get selected LLM models
            const selectedModels = getSelectedModels();

            // Show loading state
            submitButton.disabled = true;
            submitButton.innerText = 'Analyzing...';
            loadingElement.style.display = 'flex';
            errorElement.style.display = 'none';
            resultsElement.style.display = 'none';

            // Prepare request data
            const requestData = {
                brand,
                model,
                condition,
                additional_details: additionalDetails,
                use_sources: selectedModels,
                skip_cache: document.getElementById('skipCache').checked
            };

            // Call the API
            fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        throw new Error('Unauthorized');
                    }
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // Display results
                    displayResults(data.results);

                    // Show source information
                    showSourceInfo(data);
                })
                .catch(error => {
                    // Show error
                    errorMessage.innerText = error.message || 'An error occurred while fetching the price analysis.';
                    errorElement.style.display = 'block';
                })
                .finally(() => {
                    // Reset UI state
                    submitButton.disabled = false;
                    submitButton.innerText = 'Get Price Analysis';
                    loadingElement.style.display = 'none';
                });
        });
    }

    // Handle bulk form submission (bulk.html)
    if (bulkForm) {
        console.log('Setting up bulkForm event listener');
        bulkForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const fileInput = document.getElementById('csvFile');
            const file = fileInput.files[0];
            if (!file) {
                errorMessage.innerText = 'Please select a CSV file.';
                errorElement.style.display = 'block';
                return;
            }

            // Show loading state
            submitButton.disabled = true;
            submitButton.innerText = 'Processing...';
            loadingElement.style.display = 'flex';
            errorElement.style.display = 'none';
            resultsElement.style.display = 'none';

            // Prepare form data
            const formData = new FormData();
            formData.append('file', file);

            // Call the bulk API
            fetch(BULK_API_ENDPOINT, {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        throw new Error('Unauthorized');
                    }
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    displayBulkResults(data.results);
                })
                .catch(error => {
                    errorMessage.innerText = error.message || 'An error occurred while processing the bulk pricing.';
                    errorElement.style.display = 'block';
                })
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.innerText = 'Process Bulk Pricing';
                    loadingElement.style.display = 'none';
                });
        });
    }

    // Get selected LLM models (for single item form)
    function getSelectedModels() {
        const checkboxes = document.querySelectorAll('.llm-checkbox:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }

    // Fetch available models from the API (for single item form)
    function fetchAvailableModels() {
        const modelsEndpoint = `${API_BASE}/api/models`;

        fetch(modelsEndpoint)
            .then(response => {
                if (response.status === 401) {
                    window.location.href = '/login';
                    throw new Error('Unauthorized');
                }
                if (!response.ok) {
                    throw new Error('Failed to fetch available models');
                }
                return response.json();
            })
            .then(data => {
                updateModelAvailability(data.models);
            })
            .catch(error => {
                console.error('Error fetching available models:', error);
                const checkboxes = document.querySelectorAll('.llm-checkbox');
                checkboxes.forEach(checkbox => {
                    if (checkbox.value !== 'claude') {
                        checkbox.disabled = true;
                        checkbox.checked = false;
                        checkbox.parentNode.classList.add('unavailable');
                    }
                });
            });
    }

    // Update UI based on available models (for single item form)
    function updateModelAvailability(models) {
        models.forEach(model => {
            const checkbox = document.getElementById(`${model.id}Model`);
            if (checkbox) {
                checkbox.disabled = !model.available;
                if (!model.available) {
                    checkbox.checked = false;
                    checkbox.parentNode.classList.add('unavailable');
                    checkbox.parentNode.setAttribute('title', 'API key not configured');
                }
            }
        });
    }

    // Display single item results (index.html)
    function displayResults(results) {
        document.getElementById('buyPriceRange').innerText =
            `${formatCurrency(results.buy_price.min)} - ${formatCurrency(results.buy_price.max)}`;
        document.getElementById('buyPriceExplanation').innerText = results.buy_price.explanation;

        document.getElementById('maxProfitRange').innerText =
            `${formatCurrency(results.max_profit_price.min)} - ${formatCurrency(results.max_profit_price.max)}`;
        document.getElementById('maxProfitExplanation').innerText = results.max_profit_price.explanation;

        document.getElementById('quickSaleRange').innerText =
            `${formatCurrency(results.quick_sale_price.min)} - ${formatCurrency(results.quick_sale_price.max)}`;
        document.getElementById('quickSaleExplanation').innerText = results.quick_sale_price.explanation;

        document.getElementById('expectedSaleRange').innerText =
            `${formatCurrency(results.expected_sale_price.min)} - ${formatCurrency(results.expected_sale_price.max)}`;
        document.getElementById('expectedSaleExplanation').innerText = results.expected_sale_price.explanation;

        if (results.estimated_time_to_sell) {
            document.getElementById('timeToSellRange').innerText =
                formatTimeRange(
                    results.estimated_time_to_sell.min,
                    results.estimated_time_to_sell.max,
                    results.estimated_time_to_sell.unit
                );
            document.getElementById('timeToSellExplanation').innerText =
                results.estimated_time_to_sell.explanation;
        }

        document.getElementById('marketAnalysis').innerText = results.market_analysis;

        const factorsList = document.getElementById('factorsList');
        factorsList.innerHTML = '';

        results.factors.forEach(factor => {
            const li = document.createElement('li');
            li.innerText = factor;
            factorsList.appendChild(li);
        });

        if (results.meta && results.meta.models_used) {
            addModelInfoToResults(results.meta);
        }

        resultsElement.style.display = 'block';
    }

    // Display bulk results (bulk.html)
    function displayBulkResults(results) {
        const tbody = document.getElementById('resultsTableBody');
        tbody.innerHTML = ''; // Clear previous results

        results.forEach(item => {
            const row = document.createElement('tr');
            const product = item.product;
            const result = item.results;
            const error = item.error;

            row.innerHTML = `
                <td>${product.brand}</td>
                <td>${product.model}</td>
                <td>${product.condition}</td>
                ${error ? `
                    <td colspan="5" class="error-cell">${error}</td>
                ` : `
                    <td>${formatCurrency(result.buy_price.min)} - ${formatCurrency(result.buy_price.max)}</td>
                    <td>${formatCurrency(result.max_profit_price.min)} - ${formatCurrency(result.max_profit_price.max)}</td>
                    <td>${formatCurrency(result.quick_sale_price.min)} - ${formatCurrency(result.quick_sale_price.max)}</td>
                    <td>${formatCurrency(result.expected_sale_price.min)} - ${formatCurrency(result.expected_sale_price.max)}</td>
                    <td>${formatTimeRange(result.estimated_time_to_sell.min, result.estimated_time_to_sell.max, result.estimated_time_to_sell.unit)}</td>
                `}
                <td>${product.additional_details || 'N/A'}</td>
            `;

            tbody.appendChild(row);
        });

        resultsElement.style.display = 'block';
    }

    // Add model info to results (for single item form)
    function addModelInfoToResults(meta) {
        let metaInfoSection = document.querySelector('.meta-info');

        if (!metaInfoSection) {
            metaInfoSection = document.createElement('div');
            metaInfoSection.className = 'meta-info';
            const marketAnalysis = document.querySelector('.market-analysis');
            marketAnalysis.appendChild(metaInfoSection);
        }

        let metaContent = '<h4>AI Models Used</h4><ul class="models-used">';

        meta.models_used.forEach(model => {
            const modelName = getModelDisplayName(model);
            metaContent += `<li class="model-${model}">${modelName}</li>`;
        });

        metaContent += '</ul>';

        if (meta.timestamp) {
            const date = new Date(meta.timestamp);
            metaContent += `<div class="timestamp">Analysis generated: ${date.toLocaleString()}</div>`;
        }

        if (meta.price_range_variation) {
            metaContent += '<div class="variation-info"><h4>Model Agreement</h4>';

            const variationData = meta.price_range_variation;
            const categories = Object.keys(variationData);

            if (categories.length > 0) {
                metaContent += '<ul class="variation-list">';

                for (const category of categories) {
                    const variation = variationData[category];
                    const avgVariation = (variation.min_cv + variation.max_cv) / 2;
                    let agreement = 'High';

                    if (avgVariation > 0.3) {
                        agreement = 'Low';
                    } else if (avgVariation > 0.15) {
                        agreement = 'Medium';
                    }

                    let categoryName = category.replace('_price', '').replace('_', ' ');
                    if (category === 'estimated_time_to_sell') {
                        categoryName = 'Time to Sell';
                    }
                    categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

                    metaContent += `<li>${categoryName}: <span class="agreement-${agreement.toLowerCase()}">${agreement} Agreement</span></li>`;
                }

                metaContent += '</ul>';
            }

            metaContent += '</div>';
        }

        metaInfoSection.innerHTML = metaContent;
    }

    // Show source information (for single item form)
    function showSourceInfo(data) {
        const existingBadge = document.querySelector('.source-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        let sourceBadge = document.createElement('div');
        sourceBadge.className = 'source-badge';

        if (data.source === 'cache') {
            sourceBadge.classList.add('cache-source');
            sourceBadge.innerHTML = '<span>Cached Result</span>';
            if (data.cached_at) {
                const date = new Date(data.cached_at);
            }
        }
    }
});