import { createClient } from '@supabase/supabase-js'

// Environment variables for Supabase configuration
const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'X-Client-Info': 'medipay-web'
        }
    }
})

// Test database connection
export const testConnection = async() => {
    try {
        console.log('🔄 Testing Supabase connection...')

        // Test connection by querying medicines table
        const { data, error } = await supabase
            .from('medicines')
            .select('*')
            .limit(1)

        if (error) {
            console.error('❌ Supabase connection failed:', error.message)
            return false
        }

        console.log('✅ Supabase connection successful!')
        console.log('📊 Sample data from medicines table:', data)
        return true
    } catch (err) {
        console.error('❌ Supabase connection error:', err.message)
        return false
    }
}

// Auth helper functions
export const auth = {
    // Sign up with email and password
    signUp: async(email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })
        return { data, error }
    },

    // Sign in with email and password
    signIn: async(email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { data, error }
    },

    // Sign out
    signOut: async() => {
        const { error } = await supabase.auth.signOut()
        return { error }
    },

    // Get current user
    getCurrentUser: async() => {
        const { data: { user }, error } = await supabase.auth.getUser()
        return { user, error }
    },

    // Get current session
    getCurrentSession: async() => {
        const { data: { session }, error } = await supabase.auth.getSession()
        return { session, error }
    },

    // Reset password
    resetPassword: async(email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email)
        return { data, error }
    },

    // Update password
    updatePassword: async(password) => {
        const { data, error } = await supabase.auth.updateUser({ password })
        return { data, error }
    }
}

// Database helper functions
export const db = {
    // Generic table operations
    select: (table, columns = '*', filters = {}) => {
        let query = supabase.from(table).select(columns)

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
        })

        return query
    },

    insert: (table, data) => {
        return supabase.from(table).insert(data)
    },

    update: (table, data, filters = {}) => {
        let query = supabase.from(table).update(data)

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
        })

        return query
    },

    delete: (table, filters = {}) => {
        let query = supabase.from(table).delete()

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
        })

        return query
    }
}

// Medicine-specific functions
export const medicines = {
    // Get all medicines
    getAll: () => {
        return supabase.from('medicines').select('*')
    },

    // Get medicine by ID
    getById: (id) => {
        return supabase.from('medicines').select('*').eq('id', id)
    },

    // Create new medicine
    create: (medicine) => {
        return supabase.from('medicines').insert(medicine)
    },

    // Update medicine
    update: (id, updates) => {
        return supabase.from('medicines').update(updates).eq('id', id)
    },

    // Delete medicine
    delete: (id) => {
        return supabase.from('medicines').delete().eq('id', id)
    },

    // Search medicines
    search: (query) => {
        return supabase
            .from('medicines')
            .select('*')
            .or(`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
    },

    // Get medicines by category
    getByCategory: (category) => {
        return supabase.from('medicines').select('*').eq('category', category)
    },

    // Get low stock medicines
    getLowStock: () => {
        return supabase.from('medicines').select('*').lt('quantity', 10)
    }
}

// Real-time subscriptions
export const subscriptions = {
    // Subscribe to medicines table changes
    subscribeToMedicines: (callback) => {
        return supabase
            .channel('medicines_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'medicines'
            }, callback)
            .subscribe()
    },

    // Subscribe to inventory changes
    subscribeToInventory: (callback) => {
        return supabase
            .channel('inventory_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'inventory'
            }, callback)
            .subscribe()
    },

    // Subscribe to bills changes
    subscribeToBills: (callback) => {
        return supabase
            .channel('bills_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bills'
            }, callback)
            .subscribe()
    }
}

// Utility functions
export const utils = {
    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount)
    },

    // Format date
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-US')
    },

    // Format date and time
    formatDateTime: (date) => {
        return new Date(date).toLocaleString('en-US')
    },

    // Generate unique ID
    generateId: () => {
        return crypto.randomUUID()
    },

    // Validate email
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return re.test(email)
    }
}

// Export default client
export default supabase