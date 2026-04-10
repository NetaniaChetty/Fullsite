// ========== CONFIGURATION (YOUR CREDENTIALS) ==========
const SUPABASE_URL = 'https://cgtfqgjlarzzcxrtgzsf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNndGZxZ2psYXJ6emN4cnRnenNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTIyMTgsImV4cCI6MjA5MTM4ODIxOH0.D7rz1DWhPCAv1mhXsniebPgtqFzIl5vOXFgR4axNYAc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Check login state on load
supabase.auth.getSession().then(({ data: { session } }) => {
    currentUser = session?.user ?? null;
    if (currentUser) { showAdminPanel(currentUser.email); loadProducts(); }
});

// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    if (currentUser) { showAdminPanel(currentUser.email); loadProducts(); }
    else { 
        document.getElementById('loginScreen').style.display = 'block'; 
        document.getElementById('adminPanel').style.display = 'none'; 
    }
});

// Login function
window.login = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) errorEl.innerText = error.message;
    else errorEl.innerText = '';
};

// Logout function
window.logout = async function() { 
    await supabase.auth.signOut(); 
};

function showAdminPanel(email) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('userEmail').innerText = email;
}

// Load products into table
async function loadProducts() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) { console.error('Error loading products:', error); return; }
    
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = data.map(product => `
        <tr>
            <td><img src="${product.image_url || 'https://placehold.co/50x50'}" class="image-preview" onerror="this.src='https://placehold.co/50x50'"></td>
            <td>${product.name}</td>
            <td>${product.sku}</td>
            <td>R${parseFloat(product.price).toFixed(2)}</td>
            <td><input type="number" class="stock-input" value="${product.stock}" onchange="updateStock(${product.id}, this.value)" min="0"></td>
            <td>
                <button class="action-btn edit" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Update stock inline
window.updateStock = async function(id, newStock) {
    await supabase.from('products').update({ stock: parseInt(newStock) }).eq('id', id);
    loadProducts();
};

// Edit product - populate form
window.editProduct = async function(id) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) return alert('Error loading product');
    
    document.getElementById('productId').value = data.id;
    document.getElementById('productName').value = data.name;
    document.getElementById('productSku').value = data.sku;
    document.getElementById('productPrice').value = data.price;
    document.getElementById('productStock').value = data.stock;
    document.getElementById('productCategory').value = data.category || 'faucets';
    document.getElementById('formTitle').innerText = 'Edit Product';
    
    const preview = document.getElementById('imagePreviewContainer');
    preview.innerHTML = data.image_url ? `<img src="${data.image_url}" style="max-width:100px; max-height:100px;">` : '';
};

// Reset form
window.resetForm = function() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('formTitle').innerText = 'Add New Product';
    document.getElementById('imagePreviewContainer').innerHTML = '';
};

// Handle form submit (create/update)
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const sku = document.getElementById('productSku').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const category = document.getElementById('productCategory').value;
    const imageFile = document.getElementById('productImage').files[0];
    
    let image_url = null;
    
    if (imageFile) {
        const fileName = `${Date.now()}_${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
        if (uploadError) { alert('Image upload failed: ' + uploadError.message); return; }
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        image_url = publicUrl;
    }
    
    const productData = { name, sku, price, stock, category, ...(image_url && { image_url }) };
    
    let error;
    if (id) ({ error } = await supabase.from('products').update(productData).eq('id', id));
    else ({ error } = await supabase.from('products').insert([productData]));
    
    if (error) alert('Error saving product: ' + error.message);
    else { alert('Product saved!'); resetForm(); loadProducts(); }
});

// Delete product
window.deleteProduct = async function(id) {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
};