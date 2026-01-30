const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listCategories() {
    const { data, error } = await supabase
        .from('blog_categories')
        .select('*');

    if (error) {
        console.error('Error fetching categories:', error);
    } else {
        console.log('Categories:', data);
    }
}

listCategories();
