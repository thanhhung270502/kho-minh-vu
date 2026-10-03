export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      cau_hinh_phan_tich: {
        Row: {
          id: boolean
          nguong_do: number
          nguong_vang: number
          so_ngay_du_tru: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          nguong_do?: number
          nguong_vang?: number
          so_ngay_du_tru?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          nguong_do?: number
          nguong_vang?: number
          so_ngay_du_tru?: number
          updated_at?: string
        }
        Relationships: []
      }
      cau_hinh_so_ct: {
        Row: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          nguon: string
          so_chu_so: number
          tien_to: string
          updated_at: string
        }
        Insert: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          nguon?: string
          so_chu_so?: number
          tien_to: string
          updated_at?: string
        }
        Update: {
          loai_ct?: Database["public"]["Enums"]["loai_ct"]
          nguon?: string
          so_chu_so?: number
          tien_to?: string
          updated_at?: string
        }
        Relationships: []
      }
      chuc_vu: {
        Row: {
          created_at: string
          id: string
          ma: string
          pham_vi: Database["public"]["Enums"]["vai_tro"]
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ma: string
          pham_vi: Database["public"]["Enums"]["vai_tro"]
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ma?: string
          pham_vi?: Database["public"]["Enums"]["vai_tro"]
          ten?: string
          updated_at?: string
        }
        Relationships: []
      }
      chuc_vu_quyen: {
        Row: {
          chuc_vu_id: string
          created_at: string
          quyen: string
        }
        Insert: {
          chuc_vu_id: string
          created_at?: string
          quyen: string
        }
        Update: {
          chuc_vu_id?: string
          created_at?: string
          quyen?: string
        }
        Relationships: [
          {
            foreignKeyName: "chuc_vu_quyen_chuc_vu_id_fkey"
            columns: ["chuc_vu_id"]
            isOneToOne: false
            referencedRelation: "chuc_vu"
            referencedColumns: ["id"]
          },
        ]
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
          nguoi_nhan_id?: string | null
          nguoi_tao_id?: string | null
          nguon_nhap?: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang?: string[] | null
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
          nguoi_nhan_id?: string | null
          nguoi_tao_id?: string | null
          nguon_nhap?: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang?: string[] | null
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
            foreignKeyName: "chung_tu_nguoi_nhan_id_fkey"
            columns: ["nguoi_nhan_id"]
            isOneToOne: false
            referencedRelation: "nhan_vien_phu_trach"
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
          dem_lai: boolean
          dem_luc: string | null
          don_gia: number
          ghi_chu: string | null
          id: string
          kho_id: string | null
          nguoi_dem_id: string | null
          san_pham_id: string
          so_luong: number
          so_luong_he_thong: number | null
          thanh_tien: number
        }
        Insert: {
          chung_tu_id: string
          created_at?: string
          dem_lai?: boolean
          dem_luc?: string | null
          don_gia?: number
          ghi_chu?: string | null
          id?: string
          kho_id?: string | null
          nguoi_dem_id?: string | null
          san_pham_id: string
          so_luong: number
          so_luong_he_thong?: number | null
          thanh_tien?: number
        }
        Update: {
          chung_tu_id?: string
          created_at?: string
          dem_lai?: boolean
          dem_luc?: string | null
          don_gia?: number
          ghi_chu?: string | null
          id?: string
          kho_id?: string | null
          nguoi_dem_id?: string | null
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
            foreignKeyName: "chung_tu_dong_kho_id_fkey"
            columns: ["kho_id"]
            isOneToOne: false
            referencedRelation: "kho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chung_tu_dong_nguoi_dem_id_fkey"
            columns: ["nguoi_dem_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
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
          nguon: string
          so_hien_tai: number
        }
        Insert: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          nam: number
          nguon?: string
          so_hien_tai?: number
        }
        Update: {
          loai_ct?: Database["public"]["Enums"]["loai_ct"]
          nam?: number
          nguon?: string
          so_hien_tai?: number
        }
        Relationships: []
      }
      chuoi_so_dh: {
        Row: {
          nam: number
          so_hien_tai: number
        }
        Insert: {
          nam: number
          so_hien_tai?: number
        }
        Update: {
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
          ma_quy_chuan: string | null
          mau_hien_thi: string | null
          ten: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ma: string
          ma_quy_chuan?: string | null
          mau_hien_thi?: string | null
          ten: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ma?: string
          ma_quy_chuan?: string | null
          mau_hien_thi?: string | null
          ten?: string
          updated_at?: string
        }
        Relationships: []
      }
      de_nghi_gop_ma: {
        Row: {
          chung_tu_id: string | null
          created_at: string
          ghi_chu: string | null
          id: string
          nguoi_de_nghi_id: string | null
          san_pham_id_a: string
          san_pham_id_b: string
          trang_thai: string
        }
        Insert: {
          chung_tu_id?: string | null
          created_at?: string
          ghi_chu?: string | null
          id?: string
          nguoi_de_nghi_id?: string | null
          san_pham_id_a: string
          san_pham_id_b: string
          trang_thai?: string
        }
        Update: {
          chung_tu_id?: string | null
          created_at?: string
          ghi_chu?: string | null
          id?: string
          nguoi_de_nghi_id?: string | null
          san_pham_id_a?: string
          san_pham_id_b?: string
          trang_thai?: string
        }
        Relationships: [
          {
            foreignKeyName: "de_nghi_gop_ma_chung_tu_id_fkey"
            columns: ["chung_tu_id"]
            isOneToOne: false
            referencedRelation: "chung_tu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_nghi_gop_ma_nguoi_de_nghi_id_fkey"
            columns: ["nguoi_de_nghi_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_nghi_gop_ma_san_pham_id_a_fkey"
            columns: ["san_pham_id_a"]
            isOneToOne: false
            referencedRelation: "san_pham"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "de_nghi_gop_ma_san_pham_id_b_fkey"
            columns: ["san_pham_id_b"]
            isOneToOne: false
            referencedRelation: "san_pham"
            referencedColumns: ["id"]
          },
        ]
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
          doi_tac_id: string | null
          ghi_chu: string | null
          id: string
          ngay_dh: string
          ngay_giao_du_kien: string | null
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          so_dh: string
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doi_tac_id?: string | null
          ghi_chu?: string | null
          id?: string
          ngay_dh?: string
          ngay_giao_du_kien?: string | null
          nguoi_nhan_id?: string | null
          nguoi_tao_id?: string | null
          so_dh: string
          trang_thai?: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doi_tac_id?: string | null
          ghi_chu?: string | null
          id?: string
          ngay_dh?: string
          ngay_giao_du_kien?: string | null
          nguoi_nhan_id?: string | null
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
            foreignKeyName: "don_dat_hang_nguoi_nhan_id_fkey"
            columns: ["nguoi_nhan_id"]
            isOneToOne: false
            referencedRelation: "nhan_vien_phu_trach"
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
      hinh_anh: {
        Row: {
          created_at: string
          id: string
          khoa_luu: string
          khoa_luu_thumb: string
          la_anh_chinh: boolean
          nguoi_tao_id: string | null
          nguoi_xoa_id: string | null
          nguon_url: string | null
          noi_luu: string
          san_pham_id: string
          thu_tu: number
          updated_at: string
          xoa_luc: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          khoa_luu: string
          khoa_luu_thumb: string
          la_anh_chinh?: boolean
          nguoi_tao_id?: string | null
          nguoi_xoa_id?: string | null
          nguon_url?: string | null
          noi_luu: string
          san_pham_id: string
          thu_tu?: number
          updated_at?: string
          xoa_luc?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          khoa_luu?: string
          khoa_luu_thumb?: string
          la_anh_chinh?: boolean
          nguoi_tao_id?: string | null
          nguoi_xoa_id?: string | null
          nguon_url?: string | null
          noi_luu?: string
          san_pham_id?: string
          thu_tu?: number
          updated_at?: string
          xoa_luc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hinh_anh_nguoi_tao_id_fkey"
            columns: ["nguoi_tao_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hinh_anh_nguoi_xoa_id_fkey"
            columns: ["nguoi_xoa_id"]
            isOneToOne: false
            referencedRelation: "nguoi_dung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hinh_anh_san_pham_id_fkey"
            columns: ["san_pham_id"]
            isOneToOne: false
            referencedRelation: "san_pham"
            referencedColumns: ["id"]
          },
        ]
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
      ma_hoa: {
        Row: {
          created_at: string
          id: string
          loai: string
          ma: string
          ma_hang: string | null
          ten: string
          thu_tu: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          loai: string
          ma: string
          ma_hang?: string | null
          ten?: string
          thu_tu?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          loai?: string
          ma?: string
          ma_hang?: string | null
          ten?: string
          thu_tu?: number
          updated_at?: string
        }
        Relationships: []
      }
      ma_hoa_dong_bo: {
        Row: {
          bat_dau: string
          id: string
          loi: string | null
          nguoi_chay_id: string | null
          nguon: string
          so_muc: Json
          trang_thai: string
        }
        Insert: {
          bat_dau?: string
          id?: string
          loi?: string | null
          nguoi_chay_id?: string | null
          nguon: string
          so_muc?: Json
          trang_thai: string
        }
        Update: {
          bat_dau?: string
          id?: string
          loi?: string | null
          nguoi_chay_id?: string | null
          nguon?: string
          so_muc?: Json
          trang_thai?: string
        }
        Relationships: []
      }
      nguoi_dung: {
        Row: {
          chuc_vu_id: string
          created_at: string
          dang_hoat_dong: boolean
          duyet_kiem_ke: boolean
          ho_ten: string
          id: string
          kho_id: string | null
          phai_doi_mat_khau: boolean
          ten_dang_nhap: string | null
          updated_at: string
          vai_tro: Database["public"]["Enums"]["vai_tro"]
          xem_lich_su_kiotviet: boolean
        }
        Insert: {
          chuc_vu_id: string
          created_at?: string
          dang_hoat_dong?: boolean
          duyet_kiem_ke?: boolean
          ho_ten: string
          id: string
          kho_id?: string | null
          phai_doi_mat_khau?: boolean
          ten_dang_nhap?: string | null
          updated_at?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro"]
          xem_lich_su_kiotviet?: boolean
        }
        Update: {
          chuc_vu_id?: string
          created_at?: string
          dang_hoat_dong?: boolean
          duyet_kiem_ke?: boolean
          ho_ten?: string
          id?: string
          kho_id?: string | null
          phai_doi_mat_khau?: boolean
          ten_dang_nhap?: string | null
          updated_at?: string
          vai_tro?: Database["public"]["Enums"]["vai_tro"]
          xem_lich_su_kiotviet?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "nguoi_dung_chuc_vu_id_fkey"
            columns: ["chuc_vu_id"]
            isOneToOne: false
            referencedRelation: "chuc_vu"
            referencedColumns: ["id"]
          },
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
      nhan_vien_phu_trach: {
        Row: {
          created_at: string
          dang_dung: boolean
          id: string
          ten_day_du: string
          ten_viet_tat: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dang_dung?: boolean
          id?: string
          ten_day_du: string
          ten_viet_tat: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dang_dung?: boolean
          id?: string
          ten_day_du?: string
          ten_viet_tat?: string
          updated_at?: string
        }
        Relationships: []
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
          dong_xe: string | null
          duoc_ban_truc_tiep: boolean
          dvt_id: string | null
          ghi_chu: string | null
          gia_ban: number
          gia_von: number
          hang_xe: string | null
          hinh_anh_url: string | null
          id: string
          kho_mac_dinh_id: string | null
          lan_phat_sinh_cuoi: string | null
          linh_kien: string | null
          loai_hang: string
          ma_hang: string
          mo_ta: string | null
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
          dong_xe?: string | null
          duoc_ban_truc_tiep?: boolean
          dvt_id?: string | null
          ghi_chu?: string | null
          gia_ban?: number
          gia_von?: number
          hang_xe?: string | null
          hinh_anh_url?: string | null
          id?: string
          kho_mac_dinh_id?: string | null
          lan_phat_sinh_cuoi?: string | null
          linh_kien?: string | null
          loai_hang?: string
          ma_hang: string
          mo_ta?: string | null
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
          dong_xe?: string | null
          duoc_ban_truc_tiep?: boolean
          dvt_id?: string | null
          ghi_chu?: string | null
          gia_ban?: number
          gia_von?: number
          hang_xe?: string | null
          hinh_anh_url?: string | null
          id?: string
          kho_mac_dinh_id?: string | null
          lan_phat_sinh_cuoi?: string | null
          linh_kien?: string | null
          loai_hang?: string
          ma_hang?: string
          mo_ta?: string | null
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
      _chen_anh: {
        Args: {
          p_id: string
          p_khoa_luu: string
          p_khoa_luu_thumb: string
          p_nguoi_tao_id: string
          p_nguon_url: string
          p_noi_luu: string
          p_san_pham_id: string
        }
        Returns: boolean
      }
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
      _pham_vi_kiem_ke: {
        Args: { p_chung_tu_id: string }
        Returns: {
          san_pham_id: string
        }[]
      }
      ap_dung_goi_y_cong_doan: { Args: { p_ids: string[] }; Returns: number }
      bang_dem_kiem_ke: {
        Args: { p_chung_tu_id: string; p_nhom_hang_id?: string }
        Returns: {
          dem_lai: boolean
          dem_luc: string
          dong_id: string
          lech: number
          ma_hang: string
          nguoi_dem: string
          nhom_hang_id: string
          san_pham_id: string
          so_dem: number
          ten_dvt: string
          ten_hang: string
          ten_nhom: string
          ton_hien_tai: number
          ton_kiotviet: number
          ton_so: number
        }[]
      }
      bao_cao_xuat_am: {
        Args: { p_ngay?: string }
        Returns: {
          chung_tu_id: string
          dong_id: string
          ghi_chu_ly_do: string
          kho_id: string
          loai_ct: string
          ly_do_xuat_am: string
          ma_hang: string
          nguoi_lap: string
          san_pham_id: string
          so_ct: string
          so_luong_xuat: number
          ten_hang: string
          ten_kho: string
          ton_sau: number
        }[]
      }
      bo_quyet_ghi_chu: { Args: { p_gia_tri: string }; Returns: undefined }
      chi_tiet_chung_tu: {
        Args: { p_id: string }
        Returns: {
          chung_tu_goc_id: string
          created_at: string
          doi_tac_id: string
          don_dat_hang_id: string
          ghi_chu: string
          ghi_chu_ly_do: string
          ho_ten_nguoi_tao: string
          id: string
          kho_id: string
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          ly_do_xuat_am: string
          ma_doi_tac: string
          ngay_ct: string
          ngay_ghi_so: string
          nguoi_duyet_id: string
          nguoi_nhan_id: string
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"]
          so_ct: string
          so_ct_goc: string
          so_dh: string
          ten_doi_tac: string
          ten_kho: string
          ten_nguoi_nhan: string
          tong_so_luong: number
          tong_tien: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ct"]
        }[]
      }
      chi_tiet_don: {
        Args: { p_id: string }
        Returns: {
          created_at: string
          doi_tac_id: string
          ghi_chu: string
          ho_ten_nguoi_tao: string
          hoa_don_id: string
          id: string
          ma_doi_tac: string
          ngay_dh: string
          ngay_giao_du_kien: string
          nguoi_nhan_id: string
          so_dh: string
          so_hoa_don: string
          ten_doi_tac: string
          ten_nguoi_nhan: string
          tong_so_luong_da_xuat: number
          tong_so_luong_dat: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
        }[]
      }
      chi_tiet_san_pham: {
        Args: { p_id: string }
        Returns: {
          barcode: string
          can_ra: boolean
          can_ra_dvt: boolean
          cong_doan_id: string
          created_at: string
          dang_kinh_doanh: boolean
          dong_xe: string
          duoc_ban_truc_tiep: boolean
          dvt_id: string
          ghi_chu: string
          gia_ban: number
          gia_von: number
          hang_xe: string
          hinh_anh_url: string
          id: string
          kho_mac_dinh_id: string
          linh_kien: string
          loai_hang: string
          ma_cong_doan: string
          ma_hang: string
          ma_xu_ly: string
          mau_cong_doan: string
          mo_ta: string
          nhom_hang_id: string
          quy_doi: number
          ten_cong_doan: string
          ten_dong_xe: string
          ten_dvt: string
          ten_hang: string
          ten_hang_xe: string
          ten_kho_mac_dinh: string
          ten_linh_kien: string
          ten_nhom_hang: string
          ton_toi_da: number
          ton_toi_thieu: number
          tong_ton: number
          updated_at: string
          vi_tri_ke: string
        }[]
      }
      chuan_hoa_ghi_chu: { Args: { p: string }; Returns: string }
      chuan_hoa_ten: { Args: { p: string }; Returns: string }
      co_quyen: { Args: { p_quyen: string }; Returns: boolean }
      co_quyen_xem_gia_von: { Args: never; Returns: boolean }
      cong_doan_theo_duoi: { Args: { p_ma_hang: string }; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      da_doi_mat_khau: { Args: never; Returns: undefined }
      danh_sach_cau_hinh_so_ct: {
        Args: never
        Returns: {
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          nguon: string
          so_chu_so: number
          so_hien_tai: number
          tien_to: string
          vi_du: string
        }[]
      }
      danh_sach_chung_tu: {
        Args: {
          p_den_ngay?: string
          p_doi_tac_id?: string
          p_kho_id?: string
          p_kich_thuoc?: number
          p_loai_ct?: Database["public"]["Enums"]["loai_ct"]
          p_nguon_nhap?: Database["public"]["Enums"]["nguon_nhap"]
          p_trang?: number
          p_trang_thai?: Database["public"]["Enums"]["trang_thai_ct"]
          p_tu_khoa?: string
          p_tu_ngay?: string
        }
        Returns: {
          doi_tac_id: string
          ho_ten_nguoi_tao: string
          id: string
          loai_ct: Database["public"]["Enums"]["loai_ct"]
          ngay_ct: string
          ngay_ghi_so: string
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"]
          so_ct: string
          so_dong: number
          ten_doi_tac: string
          ten_kho: string
          tong_so_dong: number
          tong_so_luong: number
          tong_tien: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ct"]
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
          tong_giao_dich: number
          tong_so_dong: number
          updated_at: string
        }[]
      }
      danh_sach_don: {
        Args: {
          p_den_ngay?: string
          p_doi_tac_id?: string
          p_kich_thuoc?: number
          p_loai_nhan?: string
          p_trang?: number
          p_trang_thai?: Database["public"]["Enums"]["trang_thai_ddh"]
          p_tu_khoa?: string
          p_tu_ngay?: string
        }
        Returns: {
          created_at: string
          doi_tac_id: string
          ghi_chu: string
          ho_ten_nguoi_tao: string
          id: string
          ngay_dh: string
          ngay_giao_du_kien: string
          nguoi_nhan_id: string
          so_dh: string
          so_dong: number
          ten_doi_tac: string
          ten_nguoi_nhan: string
          tong_so_dong: number
          tong_so_luong_da_xuat: number
          tong_so_luong_dat: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
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
      danh_sach_nguoi_nhan_noi_bo: {
        Args: never
        Returns: {
          id: string
          ten_day_du: string
          ten_viet_tat: string
        }[]
      }
      danh_sach_phien_kiem_ke: {
        Args: {
          p_chung_tu_id?: string
          p_kho_id?: string
          p_kich_thuoc?: number
          p_trang?: number
          p_trang_thai?: Database["public"]["Enums"]["trang_thai_ct"]
        }
        Returns: {
          created_at: string
          id: string
          kho_id: string
          ngay_ct: string
          ngay_ghi_so: string
          nguoi_tao: string
          pham_vi_nhom_hang: string[]
          so_ct: string
          so_da_dem: number
          so_dem_lai: number
          so_trong_pham_vi: number
          ten_kho: string
          ten_nhom_pham_vi: string
          tong_so_dong: number
          trang_thai: Database["public"]["Enums"]["trang_thai_ct"]
        }[]
      }
      danh_sach_san_pham: {
        Args: {
          p_can_ra?: boolean
          p_co_anh?: boolean
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
      danh_sach_ton_kho: {
        Args: {
          p_cong_doan_id?: string
          p_dang_kinh_doanh?: boolean
          p_huong?: string
          p_kho_id?: string
          p_kich_thuoc?: number
          p_nhom_hang_id?: string
          p_sap_xep?: string
          p_trang?: number
          p_trang_thai_ton?: string
          p_tu_khoa?: string
        }
        Returns: {
          cong_doan_id: string
          dang_kinh_doanh: boolean
          id: string
          ma_cong_doan: string
          ma_hang: string
          mau_cong_doan: string
          nhom_hang_id: string
          ten_cong_doan: string
          ten_dvt: string
          ten_hang: string
          ten_nhom_hang: string
          ton_theo_kho: Json
          ton_toi_thieu: number
          tong_so_dong: number
          tong_ton: number
        }[]
      }
      dat_anh_chinh: { Args: { p_id: string }; Returns: undefined }
      dat_dem_lai: {
        Args: { p_dem_lai: boolean; p_dong_id: string }
        Returns: undefined
      }
      dat_dinh_muc: { Args: { p_ids: string[] }; Returns: number }
      dat_gia_von_dau_ky: {
        Args: { p_chi_kiem_tra?: boolean; p_du_lieu: Json }
        Returns: Json
      }
      de_xuat_dinh_muc: {
        Args: {
          p_chi_khac_hien_tai?: boolean
          p_kich_thuoc?: number
          p_nguon?: string
          p_trang?: number
        }
        Returns: {
          dinh_muc_de_xuat: number
          dinh_muc_hien_tai: number
          id: string
          ma_hang: string
          nguon_de_xuat: string
          so_lan_ban: number
          so_ma_trong_nhom_co_lich_su: number
          so_ngay_du_lieu: number
          ten_hang: string
          ten_nhom_hang: string
          tong_da_ban: number
          tong_so_dong: number
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
      dong_bo_ma_hoa: {
        Args: { p_ban_ghi: Json; p_nguon: string }
        Returns: Json
      }
      dong_chung_tu: {
        Args: { p_id: string }
        Returns: {
          don_gia: number
          ghi_chu: string
          id: string
          kho_id: string
          ma_hang: string
          san_pham_id: string
          so_luong: number
          ten_dvt: string
          ten_hang: string
          ten_kho: string
          thanh_tien: number
          ton_hien_tai: number
        }[]
      }
      dong_don: {
        Args: { p_id: string }
        Returns: {
          created_at: string
          id: string
          kho_mac_dinh_id: string
          ma_hang: string
          san_pham_id: string
          so_luong_da_xuat: number
          so_luong_dat: number
          ten_dvt: string
          ten_hang: string
          ten_kho_mac_dinh: string
        }[]
      }
      dong_don_som: {
        Args: { p_id: string; p_ly_do: string }
        Returns: {
          created_at: string
          doi_tac_id: string | null
          ghi_chu: string | null
          id: string
          ngay_dh: string
          ngay_giao_du_kien: string | null
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          so_dh: string
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "don_dat_hang"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      duyet_duoc_kiem_ke: { Args: never; Returns: boolean }
      duyet_phien_kiem_ke: {
        Args: { p_chap_nhan_khong_dem?: string[]; p_chung_tu_id: string }
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
      f_unaccent: { Args: { "": string }; Returns: string }
      gan_hang_loat: {
        Args: { p_ids: string[]; p_nguon?: string; p_thay_doi: Json }
        Returns: number
      }
      ghi_chu_quy_chuan: {
        Args: {
          p_cong_doan_id: string
          p_dong_xe: string
          p_hang_xe: string
          p_linh_kien: string
        }
        Returns: string
      }
      ghi_de_nghi_gop_ma: {
        Args: {
          p_chung_tu_id?: string
          p_ghi_chu?: string
          p_san_pham_id_a: string
          p_san_pham_id_b: string
        }
        Returns: {
          chung_tu_id: string | null
          created_at: string
          ghi_chu: string | null
          id: string
          nguoi_de_nghi_id: string | null
          san_pham_id_a: string
          san_pham_id_b: string
          trang_thai: string
        }
        SetofOptions: {
          from: "*"
          to: "de_nghi_gop_ma"
          isOneToOne: true
          isSetofReturn: false
        }
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
      goi_y_ma_trung: {
        Args: { p_gioi_han?: number; p_kho_id: string; p_san_pham_id: string }
        Returns: {
          do_giong: number
          kho_id: string
          ma_hang: string
          san_pham_id: string
          ten_hang: string
          ten_kho: string
          ton: number
        }[]
      }
      hoan_thanh_don: {
        Args: {
          p_don_id: string
          p_ghi_chu_ly_do?: string
          p_ly_do_xuat_am?: string
        }
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
      hoan_thanh_duoc_don: { Args: never; Returns: boolean }
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
      huy_don: {
        Args: { p_id: string; p_ly_do: string }
        Returns: {
          created_at: string
          doi_tac_id: string | null
          ghi_chu: string | null
          id: string
          ngay_dh: string
          ngay_giao_du_kien: string | null
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          so_dh: string
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "don_dat_hang"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      huy_duoc_don: { Args: never; Returns: boolean }
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
      la_chung_tu_kiem_ke: { Args: { p_chung_tu_id: string }; Returns: boolean }
      la_phieu_nhap: { Args: { p_chung_tu_id: string }; Returns: boolean }
      lay_khoa_anh: {
        Args: { p_id: string }
        Returns: {
          khoa_luu: string
          khoa_luu_thumb: string
          noi_luu: string
        }[]
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
      luu_dong_kiem_ke: {
        Args: {
          p_chung_tu_id: string
          p_san_pham_id: string
          p_so_luong: number
        }
        Returns: {
          chung_tu_id: string
          created_at: string
          dem_lai: boolean
          dem_luc: string | null
          don_gia: number
          ghi_chu: string | null
          id: string
          kho_id: string | null
          nguoi_dem_id: string | null
          san_pham_id: string
          so_luong: number
          so_luong_he_thong: number | null
          thanh_tien: number
        }
        SetofOptions: {
          from: "*"
          to: "chung_tu_dong"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      luu_nguoi_dung: {
        Args: {
          p_chuc_vu_id: string
          p_duyet_kiem_ke?: boolean
          p_ho_ten: string
          p_id: string
          p_kho_ids: string[]
          p_phai_doi_mat_khau: boolean
          p_ten_dang_nhap: string
          p_xem_lich_su_kiotviet?: boolean
        }
        Returns: undefined
      }
      mo_khoa_don: {
        Args: { p_id: string; p_ly_do: string }
        Returns: {
          created_at: string
          doi_tac_id: string | null
          ghi_chu: string | null
          id: string
          ngay_dh: string
          ngay_giao_du_kien: string | null
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          so_dh: string
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "don_dat_hang"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mo_phien_kiem_ke: {
        Args: {
          p_ghi_chu?: string
          p_kho_id: string
          p_nhom_hang_ids?: string[]
        }
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
      nap_anh_kiotviet: {
        Args: {
          p_id: string
          p_khoa_luu: string
          p_khoa_luu_thumb: string
          p_nguon_url: string
          p_noi_luu: string
          p_san_pham_id: string
        }
        Returns: boolean
      }
      nap_danh_muc_kiotviet: { Args: { p_du_lieu: Json }; Returns: Json }
      nap_ton_tam: {
        Args: {
          p_chi_kiem_tra?: boolean
          p_du_lieu: Json
          p_kho_mac_dinh?: string
        }
        Returns: Json
      }
      nhap_danh_muc: {
        Args: { p_chi_kiem_tra?: boolean; p_dong: Json }
        Returns: Json
      }
      nhap_ma_hang_moi: {
        Args: { p_chi_kiem_tra?: boolean; p_dong: Json; p_kho_id: string }
        Returns: Json
      }
      nhap_so_dem_kiem_ke: {
        Args: {
          p_chi_kiem_tra?: boolean
          p_chung_tu_id: string
          p_du_lieu: Json
        }
        Returns: Json
      }
      nhip_ban: {
        Args: { p_ngay?: string }
        Returns: {
          ngay: string
          so_dong: number
          so_ma: number
          so_phieu: number
        }[]
      }
      nhip_ban_theo_ngay: {
        Args: { p_ngay?: string; p_so_ngay?: number }
        Returns: {
          ngay: string
          so_hoa_don: number
          so_luong: number
        }[]
      }
      phan_tich_ton_kho: {
        Args: { p_ngay?: string; p_san_pham_id?: string; p_so_ngay?: number }
        Returns: {
          ban_nua_dau: number
          ban_nua_sau: number
          ban_tb_ngay: number
          ban_trong_ky: number
          cong_doan_ma: string
          khach_dat: number
          ma_hang: string
          ngay_ban_cuoi: string
          ngay_het_du_kien: string
          nhom_hang_id: string
          san_pham_id: string
          so_ngay_con: number
          so_ngay_thuc: number
          ten_dvt: string
          ten_hang: string
          ten_nhom_hang: string
          ton: number
          ton_kha_dung: number
          ton_toi_thieu: number
        }[]
      }
      phieu_co_dong_thuoc_kho_hien_tai: {
        Args: { p_chung_tu_id: string }
        Returns: boolean
      }
      quyen_cua_toi: { Args: never; Returns: string[] }
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
        Args: {
          p_loai: Database["public"]["Enums"]["loai_ct"]
          p_nam?: number
          p_nguon?: string
        }
        Returns: string
      }
      sinh_so_dh: { Args: { p_nam?: number }; Returns: string }
      tao_phieu_tra: {
        Args: { p_goc_id: string }
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
      tao_phieu_xuat_tu_don: {
        Args: { p_don_id: string }
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
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          nguon_nhap: Database["public"]["Enums"]["nguon_nhap"] | null
          pham_vi_nhom_hang: string[] | null
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
          ly_do_xuat_am: string
          ngay: string
          nguon: string
          so_ct: string
          so_luong_nhap: number
          so_luong_xuat: number
          ten_kho: string
          ton_luy_ke: number
          tong_so_dong: number
        }[]
      }
      them_anh: {
        Args: {
          p_id: string
          p_khoa_luu: string
          p_khoa_luu_thumb: string
          p_noi_luu: string
          p_san_pham_id: string
        }
        Returns: boolean
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
      ton_theo_nhom: {
        Args: { p_kho_id?: string; p_theo: string }
        Returns: {
          am: number
          con_hang: number
          duoi_dinh_muc: number
          het_hang: number
          nhom_id: string
          ten_nhom: string
          tong_ma: number
        }[]
      }
      tra_cuu_lich_su_kiotviet: {
        Args: {
          p_den_ngay?: string
          p_kich_thuoc?: number
          p_loai?: string
          p_ma_hang?: string
          p_san_pham_id?: string
          p_so_phieu?: string
          p_trang?: number
          p_tu_khoa?: string
          p_tu_ngay?: string
        }
        Returns: {
          doi_tac: string
          ghi_chu: string
          ma_hang: string
          ma_phieu: string
          ngay: string
          nguon: string
          so_luong: number
          ten_hang: string
          tong_nhap: number
          tong_so_dong: number
          tong_xuat: number
        }[]
      }
      vai_tro_hien_tai: {
        Args: never
        Returns: Database["public"]["Enums"]["vai_tro"]
      }
      xac_nhan_da_ra: { Args: { p_ids: string[] }; Returns: number }
      xac_nhan_don: {
        Args: { p_id: string }
        Returns: {
          created_at: string
          doi_tac_id: string | null
          ghi_chu: string | null
          id: string
          ngay_dh: string
          ngay_giao_du_kien: string | null
          nguoi_nhan_id: string | null
          nguoi_tao_id: string | null
          so_dh: string
          trang_thai: Database["public"]["Enums"]["trang_thai_ddh"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "don_dat_hang"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      xem_duoc_lich_su_kiotviet: { Args: never; Returns: boolean }
      xem_duoc_phan_tich: { Args: never; Returns: boolean }
      xoa_anh: {
        Args: { p_id: string }
        Returns: {
          khoa_luu: string
          khoa_luu_thumb: string
          noi_luu: string
        }[]
      }
      xoa_dong_kiem_ke: { Args: { p_dong_id: string }; Returns: undefined }
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
      nguon_nhap: "NCC" | "NHA_MAY"
      trang_thai_ct: "NHAP_LIEU" | "HOAN_THANH" | "DA_HUY"
      trang_thai_ddh: "TAM" | "DA_XAC_NHAN" | "HOAN_THANH" | "DA_HUY"
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
      nguon_nhap: ["NCC", "NHA_MAY"],
      trang_thai_ct: ["NHAP_LIEU", "HOAN_THANH", "DA_HUY"],
      trang_thai_ddh: ["TAM", "DA_XAC_NHAN", "HOAN_THANH", "DA_HUY"],
      vai_tro: ["quan_ly", "van_phong", "thu_kho", "chi_xem"],
    },
  },
} as const

