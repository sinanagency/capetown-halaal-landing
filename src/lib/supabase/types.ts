export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'info_requested'

export interface VendorApplication {
  id: string
  created_at: string
  updated_at: string

  // Business Info
  business_name: string
  business_description: string | null
  product_categories: string[]
  website: string | null
  instagram: string | null
  facebook: string | null

  // Contact Info
  contact_name: string
  email: string
  phone: string

  // Booth Preference
  preferred_booth_tier: string | null
  special_requirements: string | null

  // Application Status
  status: ApplicationStatus
  admin_notes: string | null
  reviewed_at: string | null
}

export type AdminRole = 'owner' | 'operator' | 'viewer'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      vendor_applications: {
        Row: VendorApplication
        Insert: Omit<VendorApplication, 'id' | 'created_at' | 'updated_at' | 'status' | 'reviewed_at'>
        Update: Partial<VendorApplication>
      }
      admin_users: {
        Row: AdminUser
        Insert: Omit<AdminUser, 'created_at'>
        Update: Partial<AdminUser>
      }
    }
  }
}
