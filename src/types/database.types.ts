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
          updated_at: string
          vai_tro: Database["public"]["Enums"]["vai_tro"]
        }
        Insert: {
          created_at?: string
          dang_hoat_dong?: boolean
          ho_ten: string
          id: string
          kho_id?: string | null
          updated_at?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro"]
        }
        Update: {
          created_at?: string
          dang_hoat_dong?: boolean
          ho_ten?: string
          id?: string
          kho_id?: string | null
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
          cong_doan_id: string | null
          created_at: string
          dang_kinh_doanh: boolean
          dvt_id: string | null
          ghi_chu: string | null
          gia_ban: number
          gia_von: number
          hinh_anh_url: string | null
          id: string
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
          cong_doan_id?: string | null
          created_at?: string
          dang_kinh_doanh?: boolean
          dvt_id?: string | null
          ghi_chu?: string | null
          gia_ban?: number
          gia_von?: number
          hinh_anh_url?: string | null
          id?: string
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
          cong_doan_id?: string | null
          created_at?: string
          dang_kinh_doanh?: boolean
          dvt_id?: string | null
          ghi_chu?: string | null
          gia_ban?: number
          gia_von?: number
          hinh_anh_url?: string | null
          id?: string
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
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
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
      kho_hien_tai: { Args: never; Returns: string }
      nap_danh_muc_kiotviet: { Args: { p_du_lieu: Json }; Returns: Json }
      sinh_so_ct: {
        Args: { p_loai: Database["public"]["Enums"]["loai_ct"]; p_nam?: number }
        Returns: string
      }
      tim_san_pham: {
        Args: { p_gioi_han?: number; p_tu_khoa: string }
        Returns: {
          barcode: string | null
          cong_doan_id: string | null
          created_at: string
          dang_kinh_doanh: boolean
          dvt_id: string | null
          ghi_chu: string | null
          gia_ban: number
          gia_von: number
          hinh_anh_url: string | null
          id: string
          lan_phat_sinh_cuoi: string | null
          ma_hang: string
          nhom_hang_id: string | null
          quy_doi: number
          ten_hang: string
          ton_toi_da: number | null
          ton_toi_thieu: number
          updated_at: string
          vi_tri_ke: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "san_pham"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      vai_tro_hien_tai: {
        Args: never
        Returns: Database["public"]["Enums"]["vai_tro"]
      }
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
