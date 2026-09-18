export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anh_xa_ghi_chu_kiotviet: {
        Row: {
          doi_tac_id: string | null
          gia_tri: string
          loai: string
          nguoi_quyet_id: string | null
          quyet_luc: string
          ten_sale: string | null
        }
        Insert: {
          doi_tac_id?: string | null
          gia_tri: string
          loai: string
          nguoi_quyet_id?: string | null
          quyet_luc?: string
          ten_sale?: string | null
        }
        Update: {
          doi_tac_id?: string | null
          gia_tri?: string
          loai?: string
          nguoi_quyet_id?: string | null
          quyet_luc?: string
          ten_sale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anh_xa_ghi_chu_kiotviet_doi_tac_id_fkey"
            columns: ["doi_tac_id"]
            isOneToOne: false
            referencedRelation: "doi_tac"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anh_xa_ghi_chu_kiotviet_nguoi_quyet_id_fkey"
            columns: ["nguoi_quyet_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      cau_hinh_so_ct: {
        Row: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          so_chu_so: number
          tien_to: string
          updated_at: string
        }
        Insert: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          so_chu_so?: number
          tien_to: string
          updated_at?: string
        }
        Update: {
          loai_ct?: Database["public"]["Enums"]["loai_ct"]
          so_chu_so?: number
          tien_to?: string
          updated_at?: string
        }
        Relationships: []
      }
      chung_tu: {
        Row: {
          chung_tu_goc_id: string | null
          created_at: string
          doi_tac_id: string | null
          don_dat_hang_id: string | null
          ghi_chu: string | null
          ghi_chu_ly_do: string | null
          giam_gia: number
          id: string
          kho_den_id: string | null
          kho_id: string
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          ly_do_xuat_am: string | null
          ngay_ct: string
          ngay_ghi_so: string | null
          nguoi_duyet_id: string | null
          nguoi_tao_id: string | null
          so_ct: string
          tong_so_luong: number
          tong_tien: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ct"]
          updated_at: string
        }
        Insert: {
          chung_tu_goc_id?: string | null
          created_at?: string
          doi_tac_id?: string | null
          don_dat_hang_id?: string | null
          ghi_chu?: string | null
          ghi_chu_ly_do?: string | null
          giam_gia?: number
          id?: string
          kho_den_id?: string | null
          kho_id: string
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          ly_do_xuat_am?: string | null
          ngay_ct?: string
          ngay_ghi_so?: string | null
          nguoi_duyet_id?: string | null
          nguoi_tao_id?: string | null
          so_ct: string
          tong_so_luong?: number
          tong_tien?: number
          trang_thai?: Database["public"]["Enums"]["trang_thai_ct"]
          updated_at?: string
        }
        Update: {
          chung_tu_goc_id?: string | null
          created_at?: string
          doi_tac_id?: string | null
          don_dat_hang_id?: string | null
          ghi_chu?: string | null
          ghi_chu_ly_do?: string | null
          giam_gia?: number
          id?: string
          kho_den_id?: string | null
          kho_id?: string
          loai_ct?: Database["public"]["Enums"]["loai_ct"]
          ly_do_xuat_am?: string | null
          ngay_ct?: string
          ngay_ghi_so?: string | null
          nguoi_duyet_id?: string | null
          nguoi_tao_id?: string | null
          so_ct?: string
          tong_so_luong?: number
          tong_tien?: number
          trang_thai?: Database["public"]["Enums"]["trang_thai_ct"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chung_tu_chung_tu_goc_id_fkey"
            columns: ["chung_tu_goc_id"]
            isOneToOne: false
            referencedRelation: "chung_tu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_doi_tac_id_fkey"
            columns: ["doi_tac_id"]
            isOneToOne: false
            referencedRelation: "doi_tac"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_don_dat_hang_id_fkey"
            columns: ["don_dat_hang_id"]
            isOneToOne: false
            referencedRelation: "don_dat_hang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_kho_den_id_fkey"
            columns: ["kho_den_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_kho_id_fkey"
            columns: ["kho_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_nguoi_duyet_id_fkey"
            columns: ["nguoi_duyet_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_nguoi_tao_id_fkey"
            columns: ["nguoi_tao_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      chung_tu_dong: {
        Row: {
          chung_tu_id: string
          created_at: string
          don_gia: number
          ghi_chu: string | null
          id: string
          san_pham_id: string
          so_luong: number
          so_luong_he_thong: number | null
          thanh_tien: number
        }
        Insert: {
          chung_tu_id: string
          created_at?: string
          don_gia?: number
          ghi_chu?: string | null
          id?: string
          san_pham_id: string
          so_luong: number
          so_luong_he_thong?: number | null
          thanh_tien?: number
        }
        Update: {
          chung_tu_id?: string
          created_at?: string
          don_gia?: number
          ghi_chu?: string | null
          id?: string
          san_pham_id?: string
          so_luong?: number
          so_luong_he_thong?: number | null
          thanh_tien?: number
        }
        Relationships: [
          {
            foreignKeyName: "chung_tu_dong_chung_tu_id_fkey"
            columns: ["chung_tu_id"]
            isOneToOne: false
            referencedRelation: "chung_tu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_dong_san_pham_id_fkey"
            columns: ["san_pham_id"]
            isOneToOne: false
            referencedRelation: "san_pham"
            referencedColumns: ["id"]
          },
        ]
      }
      chuoi_so_ct: {
        Row: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          nam: number
          so_hien_tai: number
        }
        Insert: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          nam: number
          so_hien_tai?: number
        }
        Update: {
          loai_ct?: Database["public"]["Enums"]["loai_ct"]
          nam?: number
          so_hien_tai?: number
        }
        Relationships: []
      }
      cong_doan: {
        Row: {
          created_at: string
          id: string
          ma: string
          mau_hien_thi: string | null
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ma: string
          mau_hien_thi?: string | null
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ma?: string
          mau_hien_thi?: string | null
          ten?: string
          updated_at?: string
        }
        Relationships: []
      }
      doi_tac: {
        Row: {
          created_at: string
          dang_hoat_dong: boolean
          dia_chi: string | null
          dien_thoai: string | null
          email: string | null
          ghi_chu: string | null
          id: string
          khu_vuc: string | null
          loai: Database["public"]["Enums"]["loai_doi_tac"]
          ma: string
          ma_so_thue: string | null
          phuong_xa: string | null
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dang_hoat_dong?: boolean
          dia_chi?: string | null
          dien_thoai?: string | null
          email?: string | null
          ghi_chu?: string | null
          id?: string
          khu_vuc?: string | null
          loai: Database["public"]["Enums"]["loai_doi_tac"]
          ma: string
          ma_so_thue?: string | null
          phuong_xa?: string | null
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dang_hoat_dong?: boolean
          dia_chi?: string | null
          dien_thoai?: string | null
          email?: string | null
          ghi_chu?: string | null
          id?: string
          khu_vuc?: string | null
          loai?: Database["public"]["Enums"]["loai_doi_tac"]
          ma?: string
          ma_so_thue?: string | null
          phuong_xa?: string | null
          ten?: string
          updated_at?: string
        }
        Relationships: []
      }
      don_dat_hang: {
        Row: {
          created_at: string
          doi_tac_id: string
          ghi_chu: string | null
          id: string
          ngay_dh: string
          ngay_giao_du_kien: string | null
          nguoi_tao_id: string | null
          so_dh: string
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doi_tac_id: string
          ghi_chu?: string | null
          id?: string
          ngay_dh?: string
          ngay_giao_du_kien?: string | null
          nguoi_tao_id?: string | null
          so_dh: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doi_tac_id?: string
          ghi_chu?: string | null
          id?: string
          ngay_dh?: string
          ngay_giao_du_kien?: string | null
          nguoi_tao_id?: string | null
          so_dh?: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "don_dat_hang_doi_tac_id_fkey"
            columns: ["doi_tac_id"]
            isOneToOne: false
            referencedRelation: "doi_tac"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "don_dat_hang_nguoi_tao_id_fkey"
            columns: ["nguoi_tao_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      don_dat_hang_dong: {
        Row: {
          created_at: string
          don_dat_hang_id: string
          don_gia: number
          id: string
          san_pham_id: string
          so_luong_da_xuat: number
          so_luong_dat: number
        }
        Insert: {
          created_at?: string
          don_dat_hang_id: string
          don_gia?: number
          id?: string
          san_pham_id: string
          so_luong_da_xuat?: number
          so_luong_dat: number
        }
        Update: {
          created_at?: string
          don_dat_hang_id?: string
          don_gia?: number
          id?: string
          san_pham_id?: string
          so_luong_da_xuat?: number
          so_luong_dat?: number
        }
        Relationships: [
          {
            foreignKeyName: "don_dat_hang_dong_don_dat_hang_id_fkey"
            columns: ["don_dat_hang_id"]
            isOneToOne: false
            referencedRelation: "don_dat_hang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "don_dat_hang_dong_san_pham_id_fkey"
            columns: ["san_pham_id"]
            isOneToOne: false
            referencedRelation: "san_pham"
            referencedColumns: ["id"]
          },
        ]
      }
      don_vi_tinh: {
        Row: {
          created_at: string
          id: string
          ma: string
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ma: string
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ma?: string
          ten?: string
          updated_at?: string
        }
        Relationships: []
      }
      kho: {
        Row: {
          created_at: string
          dang_hoat_dong: boolean
          dia_chi: string | null
          id: string
          ma: string
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dang_hoat_dong?: boolean
          dia_chi?: string | null
          id?: string
          ma: string
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dang_hoat_dong?: boolean
          dia_chi?: string | null
          id?: string
          ma?: string
          ten?: string
          updated_at?: string
        }
        Relationships: []
      }
      kho_movement: {
        Row: {
          chung_tu_dong_id: string | null
          chung_tu_id: string | null
          created_at: string
          gia_von_tai_thoi_diem: number
          id: string
          kho_id: string
          la_but_toan_dao: boolean
          ngay: string
          san_pham_id: string
          so_luong: number
        }
        Insert: {
          chung_tu_dong_id?: string | null
          chung_tu_id?: string | null
          created_at?: string
          gia_von_tai_thoi_diem: number
          id?: string
          kho_id: string
          la_but_toan_dao?: boolean
          ngay?: string
          san_pham_id: string
          so_luong: number
        }
        Update: {
          chung_tu_dong_id?: string | null
          chung_tu_id?: string | null
          created_at?: string
          gia_von_tai_thoi_diem?: number
          id?: string
          kho_id?: string
          la_but_toan_dao?: boolean
          ngay?: string
          san_pham_id?: string
          so_luong?: number
        }
        Relationships: [
          {
            foreignKeyName: "kho_movement_chung_tu_dong_id_fkey"
            columns: ["chung_tu_dong_id"]
            isOneToOne: false
            referencedRelation: "chung_tu_dong"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kho_movement_chung_tu_id_fkey"
            columns: ["chung_tu_id"]
            isOneToOne: false
            referencedRelation: "chung_tu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kho_movement_kho_id_fkey"
            columns: ["kho_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kho_movement_san_pham_id_fkey"
            columns: ["san_pham_id"]
            isOneToOne: false
            referencedRelation: "san_pham"
            referencedColumns: ["id"]
          },
        ]
      }
      luu_tru_hoa_don_kiotviet: {
        Row: {
          don_gia: number | null
          du_lieu_goc: Json | null
          ghi_chu: string | null
          id: string
          khach_hang: string | null
          ma_hang: string | null
          ma_hoa_don: string | null
          nap_luc: string
          ngay: string | null
          so_luong: number | null
          ten_hang: string | null
          thanh_tien: number | null
        }
        Insert: {
          don_gia?: number | null
          du_lieu_goc?: Json | null
          ghi_chu?: string | null
          id?: string
          khach_hang?: string | null
          ma_hang?: string | null
          ma_hoa_don?: string | null
          nap_luc?: string
          ngay?: string | null
          so_luong?: number | null
          ten_hang?: string | null
          thanh_tien?: number | null
        }
        Update: {
          don_gia?: number | null
          du_lieu_goc?: Json | null
          ghi_chu?: string | null
          id?: string
          khach_hang?: string | null
          ma_hang?: string | null
          ma_hoa_don?: string | null
          nap_luc?: string
          ngay?: string | null
          so_luong?: number | null
          ten_hang?: string | null
          thanh_tien?: number | null
        }
        Relationships: []
      }
      luu_tru_nhap_kiotviet: {
        Row: {
          don_gia: number | null
          du_lieu_goc: Json | null
          ghi_chu: string | null
          id: string
          ma_hang: string | null
          ma_phieu: string | null
          nap_luc: string
          ngay: string | null
          nha_cung_cap: string | null
          so_luong: number | null
          ten_hang: string | null
          thanh_tien: number | null
        }
        Insert: {
          don_gia?: number | null
          du_lieu_goc?: Json | null
          ghi_chu?: string | null
          id?: string
          ma_hang?: string | null
          ma_phieu?: string | null
          nap_luc?: string
          ngay?: string | null
          nha_cung_cap?: string | null
          so_luong?: number | null
          ten_hang?: string | null
          thanh_tien?: number | null
        }
        Update: {
          don_gia?: number | null
          du_lieu_goc?: Json | null
          ghi_chu?: string | null
          id?: string
          ma_hang?: string | null
          ma_phieu?: string | null
          nap_luc?: string
          ngay?: string | null
          nha_cung_cap?: string | null
          so_luong?: number | null
          ten_hang?: string | null
          thanh_tien?: number | null
        }
        Relationships: []
      }
      nguoi_dung: {
        Row: {
          created_at: string
          dang_hoat_dong: boolean
          ho_ten: string
          id: string
          kho_id: string | null
          phai_doi_mat_khau: boolean
          ten_dang_nhap: string | null
          updated_at: string
          vai_tro: Database["public"]["Enums"]["vai_tro"]
        }
        Insert: {
          created_at?: string
          dang_hoat_dong?: boolean
          ho_ten: string
          id: string
          kho_id?: string | null
          phai_doi_mat_khau?: boolean
          ten_dang_nhap?: string | null
          updated_at?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro"]
        }
        Update: {
          created_at?: string
          dang_hoat_dong?: boolean
          ho_ten?: string
          id?: string
          kho_id?: string | null
          phai_doi_mat_khau?: boolean
          ten_dang_nhap?: string | null
          updated_at?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro"]
        }
        Relationships: [
          {
            foreignKeyName: "nguoi_dung_kho_id_fkey"
            columns: ["kho_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
        ]
      }
      nguoi_dung_kho: {
        Row: {
          created_at: string
          kho_id: string
          nguoi_dung_id: string
        }
        Insert: {
          created_at?: string
          kho_id: string
          nguoi_dung_id: string
        }
        Update: {
          created_at?: string
          kho_id?: string
          nguoi_dung_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nguoi_dung_kho_kho_id_fkey"
            columns: ["kho_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nguoi_dung_kho_nguoi_dung_id_fkey"
            columns: ["nguoi_dung_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      nhat_ky_doi_chieu: {
        Row: {
          chay_luc: string
          chi_tiet: Json | null
          ghi_chu: string | null
          id: string
          so_dong_lech: number
        }
        Insert: {
          chay_luc?: string
          chi_tiet?: Json | null
          ghi_chu?: string | null
          id?: string
          so_dong_lech: number
        }
        Update: {
          chay_luc?: string
          chi_tiet?: Json | null
          ghi_chu?: string | null
          id?: string
          so_dong_lech?: number
        }
        Relationships: []
      }
      nhat_ky_sua: {
        Row: {
          ban_ghi_id: string
          bang: string
          gia_tri_cu: Json | null
          gia_tri_moi: Json | null
          id: string
          nguoi_sua_id: string | null
          nguon: string
          sua_luc: string
          truong: string
        }
        Insert: {
          ban_ghi_id: string
          bang: string
          gia_tri_cu?: Json | null
          gia_tri_moi?: Json | null
          id?: string
          nguoi_sua_id?: string | null
          nguon: string
          sua_luc?: string
          truong: string
        }
        Update: {
          ban_ghi_id?: string
          bang?: string
          gia_tri_cu?: Json | null
          gia_tri_moi?: Json | null
          id?: string
          nguoi_sua_id?: string | null
          nguon?: string
          sua_luc?: string
          truong?: string
        }
        Relationships: [
          {
            foreignKeyName: "nhat_ky_sua_nguoi_sua_id_fkey"
            columns: ["nguoi_sua_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
        ]
      }
      nhom_hang: {
        Row: {
          created_at: string
          id: string
          ma: string
          parent_id: string | null
          ten: string
          thu_tu: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ma: string
          parent_id?: string | null
          ten: string
          thu_tu?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ma?: string
          parent_id?: string | null
          ten?: string
          thu_tu?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nhom_hang_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nhom_hang"
            referencedColumns: ["id"]
          },
        ]
      }
      san_pham: {
        Row: {
          barcode: string | null
          can_ra_dvt: boolean
          cong_doan_id: string | null
          created_at: string
          da_xac_nhan_ra: boolean
          dang_kinh_doanh: boolean
          dvt_id: string | null
          ghi_chu: string | null
          gia_ban: number
          gia_von: number
          hinh_anh_url: string | null
          id: string
          kho_mac_dinh_id: string | null
          lan_phat_sinh_cuoi: string | null
          ma_hang: string
          nhom_hang_id: string | null
          quy_doi: number
          ten_hang: string
          ton_toi_da: number | null
          ton_toi_thieu: number
          updated_at: string
          vi_tri_ke: string | null
        }
        Insert: {
          barcode?: string | null
          can_ra_dvt?: boolean
          cong_doan_id?: string | null
          created_at?: string
          da_xac_nhan_ra?: boolean
          dang_kinh_doanh?: boolean
          dvt_id?: string | null
          ghi_chu?: string | null
          gia_ban?: number
          gia_von?: number
          hinh_anh_url?: string | null
          id?: string
          kho_mac_dinh_id?: string | null
          lan_phat_sinh_cuoi?: string | null
          ma_hang: string
          nhom_hang_id?: string | null
          quy_doi?: number
          ten_hang: string
          ton_toi_da?: number | null
          ton_toi_thieu?: number
          updated_at?: string
          vi_tri_ke?: string | null
        }
        Update: {
          barcode?: string | null
          can_ra_dvt?: boolean
          cong_doan_id?: string | null
          created_at?: string
          da_xac_nhan_ra?: boolean
          dang_kinh_doanh?: boolean
          dvt_id?: string | null
          ghi_chu?: string | null
          gia_ban?: number
          gia_von?: number
          hinh_anh_url?: string | null
          id?: string
          kho_mac_dinh_id?: string | null
          lan_phat_sinh_cuoi?: string | null
          ma_hang?: string
          nhom_hang_id?: string | null
          quy_doi?: number
          ten_hang?: string
          ton_toi_da?: number | null
          ton_toi_thieu?: number
          updated_at?: string
          vi_tri_ke?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "san_pham_cong_doan_id_fkey"
            columns: ["cong_doan_id"]
            isOneToOne: false
            referencedRelation: "cong_doan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "san_pham_dvt_id_fkey"
            columns: ["dvt_id"]
            isOneToOne: false
            referencedRelation: "don_vi_tinh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "san_pham_kho_mac_dinh_id_fkey"
            columns: ["kho_mac_dinh_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "san_pham_nhom_hang_id_fkey"
            columns: ["nhom_hang_id"]
            isOneToOne: false
            referencedRelation: "nhom_hang"
            referencedColumns: ["id"]
          },
        ]
      }
      ton_kho: {
        Row: {
          cap_nhat_luc: string
          kho_id: string
          san_pham_id: string
          so_luong: number
        }
        Insert: {
          cap_nhat_luc?: string
          kho_id: string
          san_pham_id: string
          so_luong?: number
        }
        Update: {
          cap_nhat_luc?: string
          kho_id?: string
          san_pham_id?: string
          so_luong?: number
        }
        Relationships: [
          {
            foreignKeyName: "ton_kho_kho_id_fkey"
            columns: ["kho_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ton_kho_san_pham_id_fkey"
            columns: ["san_pham_id"]
            isOneToOne: false
            referencedRelation: "san_pham"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_doi_chieu_ton: {
        Row: {
          chenh_lech: number | null
          kho_id: string | null
          san_pham_id: string | null
          ton_theo_bang: number | null
          ton_theo_so_cai: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cap_nhat_tien_do_ddh: { Args: { p_ddh_id: string }; Returns: undefined }
      _doi_chieu_ton_he_thong: { Args: never; Returns: number }
      _ghi_so_chuyen_kho: {
        Args: {
          p_ct: Database["public"]["Tables"]["chung_tu"]["Row"]
          p_dong: Database["public"]["Tables"]["chung_tu_dong"]["Row"]
        }
        Returns: undefined
      }
      _ghi_so_dieu_chinh: {
        Args: {
          p_ct: Database["public"]["Tables"]["chung_tu"]["Row"]
          p_dong: Database["public"]["Tables"]["chung_tu_dong"]["Row"]
        }
        Returns: undefined
      }
      _ghi_so_kiem_ke: {
        Args: {
          p_ct: Database["public"]["Tables"]["chung_tu"]["Row"]
          p_dong: Database["public"]["Tables"]["chung_tu_dong"]["Row"]
        }
        Returns: undefined
      }
      _ghi_so_nhap: {
        Args: {
          p_ct: Database["public"]["Tables"]["chung_tu"]["Row"]
          p_dong: Database["public"]["Tables"]["chung_tu_dong"]["Row"]
        }
        Returns: undefined
      }
      _ghi_so_tra_khach: {
        Args: {
          p_ct: Database["public"]["Tables"]["chung_tu"]["Row"]
          p_dong: Database["public"]["Tables"]["chung_tu_dong"]["Row"]
        }
        Returns: undefined
      }
      _ghi_so_tra_ncc: {
        Args: {
          p_ct: Database["public"]["Tables"]["chung_tu"]["Row"]
          p_dong: Database["public"]["Tables"]["chung_tu_dong"]["Row"]
        }
        Returns: undefined
      }
      _ghi_so_xuat: {
        Args: {
          p_ct: Database["public"]["Tables"]["chung_tu"]["Row"]
          p_dong: Database["public"]["Tables"]["chung_tu_dong"]["Row"]
        }
        Returns: undefined
      }
      ap_dung_goi_y_cong_doan: { Args: { p_ids: string[] }; Returns: number }
      bo_quyet_ghi_chu: { Args: { p_gia_tri: string }; Returns: undefined }
      chi_tiet_san_pham: {
        Args: { p_id: string }
        Returns: {
          barcode: string
          can_ra: boolean
          can_ra_dvt: boolean
          cong_doan_id: string
          created_at: string
          dang_kinh_doanh: boolean
          dvt_id: string
          ghi_chu: string
          gia_ban: number
          gia_von: number
          hinh_anh_url: string
          id: string
          kho_mac_dinh_id: string
          ma_cong_doan: string
          ma_hang: string
          mau_cong_doan: string
          nhom_hang_id: string
          quy_doi: number
          ten_cong_doan: string
          ten_dvt: string
          ten_hang: string
          ten_kho_mac_dinh: string
          ten_nhom_hang: string
          ton_toi_da: number
          ton_toi_thieu: number
          tong_ton: number
          updated_at: string
          vi_tri_ke: string
        }[]
      }
      chuan_hoa_ghi_chu: { Args: { p: string }; Returns: string }
      co_quyen_xem_gia_von: { Args: never; Returns: boolean }
      cong_doan_theo_duoi: { Args: { p_ma_hang: string }; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      da_doi_mat_khau: { Args: never; Returns: undefined }
      danh_sach_cau_hinh_so_ct: {
        Args: never
        Returns: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          so_chu_so: number
          so_hien_tai: number
          tien_to: string
          vi_du: string
        }[]
      }
      danh_sach_doi_tac: {
        Args: {
          p_dang_hoat_dong?: boolean
          p_kich_thuoc?: number
          p_loai?: Database["public"]["Enums"]["loai_doi_tac"]
          p_trang?: number
          p_tu_khoa?: string
        }
        Returns: {
          dang_hoat_dong: boolean
          dia_chi: string
          dien_thoai: string
          email: string
          ghi_chu: string
          id: string
          khu_vuc: string
          loai: Database["public"]["Enums"]["loai_doi_tac"]
          ma: string
          ma_so_thue: string
          ten: string
          tong_so_dong: number
          updated_at: string
        }[]
      }
      danh_sach_ghi_chu_kiotviet: {
        Args: {
          p_kich_thuoc?: number
          p_trang?: number
          p_trang_thai?: string
          p_tu_khoa?: string
        }
        Returns: {
          doi_tac_id: string
          gia_tri: string
          hoa_don_mau: string[]
          loai: string
          ngay_cuoi: string
          ngay_dau: string
          so_dong: number
          so_hoa_don: number
          ten_doi_tac: string
          ten_sale: string
          tong_so_dong: number
        }[]
      }
      danh_sach_san_pham: {
        Args: {
          p_can_ra?: boolean
          p_cong_doan_id?: string
          p_dang_kinh_doanh?: boolean
          p_dvt_id?: string
          p_huong?: string
          p_kich_thuoc?: number
          p_nhom_hang_id?: string
          p_sap_xep?: string
          p_trang?: number
          p_trang_thai_ton?: string
          p_tu_khoa?: string
        }
        Returns: {
          can_ra: boolean
          can_ra_dvt: boolean
          cong_doan_id: string
          dang_kinh_doanh: boolean
          dvt_id: string
          gia_ban: number
          gia_von: number
          id: string
          kho_mac_dinh_id: string
          ma_cong_doan: string
          ma_hang: string
          mau_cong_doan: string
          nhom_hang_id: string
          quy_doi: number
          ten_cong_doan: string
          ten_dvt: string
          ten_hang: string
          ten_nhom_hang: string
          ton_toi_da: number
          ton_toi_thieu: number
          tong_so_dong: number
          tong_ton: number
          updated_at: string
        }[]
      }
      doi_chieu_ton: {
        Args: never
        Returns: {
          chenh_lech: number
          kho_id: string
          san_pham_id: string
          ton_theo_bang: number
          ton_theo_so_cai: number
        }[]
      }
      f_unaccent: { Args: { "": string }; Returns: string }
      gan_hang_loat: {
        Args: { p_ids: string[]; p_nguon?: string; p_thay_doi: Json }
        Returns: number
      }
      ghi_so_chung_tu: {
        Args: { p_chung_tu_id: string }
        Returns: {
          chung_tu_goc_id: string | null
          created_at: string
          doi_tac_id: string | null
          don_dat_hang_id: string | null
          ghi_chu: string | null
          ghi_chu_ly_do: string | null
          giam_gia: number
          id: string
          kho_den_id: string | null
          kho_id: string
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          ly_do_xuat_am: string | null
          ngay_ct: string
          ngay_ghi_so: string | null
          nguoi_duyet_id: string | null
          nguoi_tao_id: string | null
          so_ct: string
          tong_so_luong: number
          tong_tien: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ct"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chung_tu"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gia_von_san_pham: {
        Args: { p_ids: string[] }
        Returns: {
          gia_von: number
          san_pham_id: string
        }[]
      }
      goi_y_cong_doan_theo_duoi: {
        Args: never
        Returns: {
          cong_doan_de_xuat_id: string
          id: string
          ma_cong_doan_de_xuat: string
          ma_hang: string
          ten_cong_doan_de_xuat: string
          ten_hang: string
          ten_nhom_hang: string
        }[]
      }
      huy_chung_tu: {
        Args: { p_chung_tu_id: string; p_ly_do: string }
        Returns: {
          chung_tu_goc_id: string | null
          created_at: string
          doi_tac_id: string | null
          don_dat_hang_id: string | null
          ghi_chu: string | null
          ghi_chu_ly_do: string | null
          giam_gia: number
          id: string
          kho_den_id: string | null
          kho_id: string
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          ly_do_xuat_am: string | null
          ngay_ct: string
          ngay_ghi_so: string | null
          nguoi_duyet_id: string | null
          nguoi_tao_id: string | null
          so_ct: string
          tong_so_luong: number
          tong_tien: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ct"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "chung_tu"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      kho_hien_tai: { Args: never; Returns: string[] }
      khop_danh_muc: {
        Args: { p_bang: string; p_gia_tri: string }
        Returns: string
      }
      la_can_ra: {
        Args: {
          p_can_ra_dvt: boolean
          p_cong_doan_ma: string
          p_da_xac_nhan: boolean
          p_ma_hang: string
          p_ten_nhom: string
        }
        Returns: boolean
      }
      lich_su_giao_dich_doi_tac: {
        Args: { p_doi_tac_id: string; p_kich_thuoc?: number; p_trang?: number }
        Returns: {
          chung_tu_id: string
          ghi_chu: string
          loai: string
          ma_phieu: string
          ngay: string
          nguon: string
          so_dong: number
          tong_so_dong: number
          tong_so_luong: number
        }[]
      }
      lich_su_sua: {
        Args: { p_ban_ghi_id: string; p_bang: string; p_gioi_han?: number }
        Returns: {
          gia_tri_cu: Json
          gia_tri_moi: Json
          ho_ten_nguoi_sua: string
          id: string
          nguoi_sua_id: string
          nguon: string
          sua_luc: string
          truong: string
        }[]
      }
      luu_ho_so_nguoi_dung: {
        Args: {
          p_ho_ten: string
          p_id: string
          p_kho_ids: string[]
          p_phai_doi_mat_khau: boolean
          p_ten_dang_nhap: string
          p_vai_tro: Database["public"]["Enums"]["vai_tro"]
        }
        Returns: undefined
      }
      nap_danh_muc_kiotviet: { Args: { p_du_lieu: Json }; Returns: Json }
      nhap_danh_muc: {
        Args: { p_chi_kiem_tra?: boolean; p_dong: Json }
        Returns: Json
      }
      quyet_ghi_chu: {
        Args: {
          p_doi_tac_id?: string
          p_gia_tri: string
          p_loai: string
          p_tao_khach?: Json
          p_ten_sale?: string
        }
        Returns: {
          doi_tac_id: string | null
          gia_tri: string
          loai: string
          nguoi_quyet_id: string | null
          quyet_luc: string
          ten_sale: string | null
        }
        SetofOptions: {
          from: "*"
          to: "anh_xa_ghi_chu_kiotviet"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sinh_ma_doi_tac: {
        Args: { p_loai: Database["public"]["Enums"]["loai_doi_tac"] }
        Returns: string
      }
      sinh_so_ct: {
        Args: { p_loai: Database["public"]["Enums"]["loai_ct"]; p_nam?: number }
        Returns: string
      }
      ten_danh_muc: { Args: { p_bang: string; p_id: string }; Returns: string }
      the_kho_san_pham: {
        Args: {
          p_kho_id?: string
          p_kich_thuoc?: number
          p_san_pham_id: string
          p_trang?: number
        }
        Returns: {
          chung_tu_id: string
          doi_tac: string
          ghi_chu: string
          gia_von_tai_thoi_diem: number
          kho_id: string
          la_but_toan_dao: boolean
          loai_ct: string
          ngay: string
          nguon: string
          so_ct: string
          so_luong_nhap: number
          so_luong_xuat: number
          ten_kho: string
          tong_so_dong: number
        }[]
      }
      thu_hoi_phien_nguoi_dung: {
        Args: { p_nguoi_dung_id: string }
        Returns: number
      }
      tim_san_pham: {
        Args: { p_gioi_han?: number; p_tu_khoa: string }
        Returns: {
          barcode: string
          cong_doan_id: string
          dang_kinh_doanh: boolean
          dvt_id: string
          gia_ban: number
          id: string
          kho_mac_dinh_id: string
          lan_phat_sinh_cuoi: string
          ma_hang: string
          nhom_hang_id: string
          quy_doi: number
          ten_hang: string
        }[]
      }
      vai_tro_hien_tai: {
        Args: never
        Returns: Database["public"]["Enums"]["vai_tro"]
      }
      xac_nhan_da_ra: { Args: { p_ids: string[] }; Returns: number }
    }
    Enums: {
      loai_ct:
        | "NHAP"
        | "XUAT"
        | "TRA_NCC"
        | "TRA_KHACH"
        | "CHUYEN_KHO"
        | "KIEM_KE"
        | "DIEU_CHINH"
      loai_doi_tac: "NCC" | "KHACH" | "CA_HAI"
      trang_thai_ct: "NHAP_LIEU" | "HOAN_THANH" | "DA_HUY"
      trang_thai_ddh: "MOI" | "DA_XUAT_MOT_PHAN" | "DA_XUAT_DU" | "DA_HUY"
      vai_tro: "quan_ly" | "van_phong" | "thu_kho" | "chi_xem"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      loai_ct: [
        "NHAP",
        "XUAT",
        "TRA_NCC",
        "TRA_KHACH",
        "CHUYEN_KHO",
        "KIEM_KE",
        "DIEU_CHINH",
      ],
      loai_doi_tac: ["NCC", "KHACH", "CA_HAI"],
      trang_thai_ct: ["NHAP_LIEU", "HOAN_THANH", "DA_HUY"],
      trang_thai_ddh: ["MOI", "DA_XUAT_MOT_PHAN", "DA_XUAT_DU", "DA_HUY"],
      vai_tro: ["quan_ly", "van_phong", "thu_kho", "chi_xem"],
    },
  },
} as const
