import React from 'react';
import { useStore } from '../store/useStore.js';
import { useForm } from 'react-hook-form';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Phone, 
  Mail,
  ShieldAlert 
} from 'lucide-react';

export default function UsersPage() {
  const { currentUser, setCurrentUser } = useStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Mock users list matching DB default seed
  const [users, setUsers] = React.useState([
    { id: 'usr-1', username: 'admin', fullname: 'Nguyễn Quản Trị', role: 'admin', phone: '0988888888', email: 'admin@beverage.com', active: true },
    { id: 'usr-2', username: 'manager', fullname: 'Trần Cửa Hàng Trưởng', role: 'manager', phone: '0977777777', email: 'manager@beverage.com', active: true },
    { id: 'usr-3', username: 'staff', fullname: 'Lê Nhân Viên Kho', role: 'staff', phone: '0966666666', email: 'staff@beverage.com', active: true }
  ]);

  const handleCreateUser = (data) => {
    // Check duplication
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      alert('Tên tài khoản này đã tồn tại!');
      return;
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      username: data.username.toLowerCase(),
      fullname: data.fullname,
      role: data.role,
      phone: data.phone || '-',
      email: data.email || '-',
      active: true
    };

    setUsers([...users, newUser]);
    reset();
    alert('Thêm tài khoản nhân sự mới thành công!');
  };

  const handleToggleSession = (user) => {
    setCurrentUser(user);
    alert(`Đã chuyển phiên làm việc sang: ${user.fullname} (${user.role.toUpperCase()})`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Nhân Sự & Phân Quyền</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cấu hình tài khoản nhân sự và phân chia quyền truy cập hệ thống iPOS.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: ADD USER FORM */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
            <UserPlus size={16} /> Thêm nhân sự mới
          </h3>
          
          <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-3.5">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Họ và Tên *</label>
              <input 
                type="text" 
                placeholder="Nguyễn Văn A"
                {...register('fullname', { required: true })}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
              />
              {errors.fullname && <span className="text-[10px] text-rose-500 font-bold">Vui lòng điền họ tên.</span>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Tên đăng nhập (@) *</label>
              <input 
                type="text" 
                placeholder="nhanvien_kho"
                {...register('username', { required: true, pattern: /^[a-zA-Z0-9_]+$/ })}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-semibold"
              />
              {errors.username && <span className="text-[10px] text-rose-500 font-bold">Tên tài khoản không hợp lệ (chỉ chữ, số, gạch dưới).</span>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Vai trò / Phân quyền *</label>
              <select 
                {...register('role', { required: true })}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-semibold"
              >
                <option value="staff">Staff (Nhân viên ca - Nhập/Xuất/Kiểm kho)</option>
                <option value="manager">Manager (Quản lý - Kho & Báo cáo)</option>
                <option value="admin">Admin (Quản trị viên - Toàn quyền)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Điện thoại</label>
                <input 
                  type="text" 
                  placeholder="09..."
                  {...register('phone')}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Email</label>
                <input 
                  type="email" 
                  placeholder="a@b.com"
                  {...register('email')}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <UserPlus size={14} /> Thêm nhân sự
            </button>

          </form>
        </div>

        {/* RIGHT: USERS LIST & SESSION TOGGLERS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* USER GRID */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
              <Users size={16} /> Danh sách nhân sự
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {users.map(u => {
                const isSelected = u.id === currentUser.id;
                let roleColor = 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400';
                if (u.role === 'admin') roleColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400';
                if (u.role === 'manager') roleColor = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';

                return (
                  <div 
                    key={u.id}
                    onClick={() => handleToggleSession(u)}
                    className={`p-4 border rounded-2xl text-left cursor-pointer transition-all flex justify-between items-start ${isSelected ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-white dark:bg-slate-900'}`}
                  >
                    <div className="space-y-2.5">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          {u.fullname}
                          {isSelected && <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-0.5"><UserCheck size={9} /> BẠN</span>}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                      </div>
                      
                      <div className="space-y-1 text-[11px] text-slate-400">
                        <p className="flex items-center gap-1"><Phone size={10} /> {u.phone}</p>
                        <p className="flex items-center gap-1"><Mail size={10} /> {u.email}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${roleColor}`}>
                      {u.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PERMISSIONS MATRIX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
              <ShieldCheck size={16} /> Bảng đối chiếu phân quyền chi tiết
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3 text-center">Dashboard</th>
                    <th className="px-4 py-3 text-center">Sản phẩm & BOM</th>
                    <th className="px-4 py-3 text-center">Nhập/Xuất kho</th>
                    <th className="px-4 py-3 text-center">Kiểm kho ca</th>
                    <th className="px-4 py-3 text-center">Báo cáo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-center text-slate-700 dark:text-slate-300">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-left font-bold text-slate-800 dark:text-slate-100">Admin</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-left font-bold text-slate-800 dark:text-slate-100">Manager</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Có</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-left font-bold text-slate-800 dark:text-slate-100">Staff</td>
                    <td className="px-4 py-3 text-rose-600">✖ Ẩn</td>
                    <td className="px-4 py-3 text-rose-600">✖ Ẩn</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Chỉ phiếu</td>
                    <td className="px-4 py-3 text-emerald-600">✔ Đếm thực tế</td>
                    <td className="px-4 py-3 text-rose-600">✖ Ẩn</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-950/30 rounded-xl flex gap-2.5 text-xs text-blue-700 dark:text-blue-400 leading-normal">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <p className="font-semibold">Mẹo kiểm thử: Bạn chỉ cần click chọn tài khoản nhân viên bất kỳ ở trên để chuyển đổi phiên làm việc và kiểm tra phân quyền ẩn/hiện giao diện tương ứng lập tức.</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
