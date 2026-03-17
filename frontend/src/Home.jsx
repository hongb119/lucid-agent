import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";

// 이미지 경로는 프로젝트 상황에 맞게 조정하세요.
import logo from "./assets/logo.png";
import heroBg from "./assets/hero-bg.jpg";
import lucidTree from "./assets/lucid-tree.png";

const Home = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 1. 페이지 로드 시 로컬 스토리지에서 유저 정보 확인
  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
  }, []);

  // 2. 로그아웃 처리 함수
  const handleLogout = () => {
  if (window.confirm("로그아웃 하시겠습니까?")) {
    // userInfo와 더불어 isLoggedIn 등 기존에 쓰던 값들도 같이 지워주면 안전합니다.
    localStorage.clear(); 
    setUser(null);
    navigate("/");
  }
  };

  // 3. 권한별 대시보드 이동 함수 (지점코드/사용자코드 유지하며 이동)
  const handleGoDashboard = () => {
    if (!user) return;
      navigate("/"); 
    // MainLayout에서 설정한 경로로 분기
    /*switch (user.role) {
      case "HQ":
      case "ADMIN":
        navigate("/admin"); // MainLayout이 관리자용 화면으로 연결
        break;
      case "TEACHER":
        navigate("/teacher");
        break;
      case "STUDENT":
        navigate("/student");
        break;
      default:
        alert("권한 정보가 올바르지 않습니다.");
        navigate("/");
    }*/

  };

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 font-sans">
      
      {/* --- 1. 내비게이션 바 --- */}
      <nav className="fixed top-0 left-0 w-full h-20 bg-white/95 backdrop-blur-sm z-[100] border-b border-gray-100 flex justify-center">
        <div className="w-full max-w-7xl flex items-center justify-between px-6 md:px-12">
          {/* 좌측 로고 영역 */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="LUCID" className="h-10 w-auto object-contain" />
            <span className="text-xl md:text-2xl font-black text-[#003366] tracking-tight">
              LUCID ACADEMY
            </span>
          </div>
          
          {/* 우측 버튼 영역 */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                    {user.role} | Org:{user.orgId}
                  </span>
                  <span className="text-sm font-black text-[#003366]">{user.name} 님</span>
                </div>
                <button 
                  onClick={handleGoDashboard}
                  className="bg-[#003366] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-900 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {(user.role === "ADMIN" || user.role === "HQ") ? "관리실 입장" : 
                   user.role === "TEACHER" ? "강의실 입장" : "학습실 입장"}
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-500 text-sm font-bold transition-colors cursor-pointer"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="bg-[#003366] text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-900 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* --- 2. 메인 히어로 섹션 --- */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center pt-20">
        <div 
          className="absolute inset-0 z-0 opacity-15"
          style={{ 
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
          <p className="text-[#003366] font-bold tracking-[0.3em] mb-6 uppercase text-sm md:text-base">
            Premium English Education
          </p>
          <h1 className="text-5xl md:text-8xl font-black text-gray-900 leading-[1.1] mb-8">
            생각이 자라는 <br/>
            <span className="text-[#003366]">루시드 영어</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-600 max-w-2xl leading-relaxed mb-12 font-medium">
            지점 코드 <span className="text-[#003366] font-bold">{user?.orgId || "연동중"}</span>를 기반으로 <br className="hidden md:block"/> 
            스마트한 학생 관리를 시작하세요.
          </p>
          <button className="bg-[#003366] text-white px-12 py-4 rounded-full font-black text-xl hover:scale-105 transition-transform shadow-2xl cursor-pointer">
            프로그램 안내받기
          </button>
        </div>
      </section>

      {/* --- 3. LUCID Tree 섹션 --- */}
      <section className="w-full py-32 bg-gray-50 flex justify-center">
        <div className="w-full max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black text-[#003366] italic mb-4">LUCID Tree</h2>
            <div className="h-1.5 w-24 bg-blue-400 mx-auto rounded-full"></div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
            <div className="flex-1 w-full flex justify-center">
              <img src={lucidTree} alt="LUCID Tree" className="w-full max-w-sm drop-shadow-2xl" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-8">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                <p className="text-xl md:text-2xl text-gray-700 leading-loose">
                  단순 암기가 아닌 <br/>
                  <strong className="text-[#003366] text-3xl">생각의 뿌리</strong>를 내리는 교육. <br/>
                  <span className="text-blue-500 font-bold">전 지점 통합 관리</span>로 효율을 더합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 4. 푸터 --- */}
      <footer className="w-full py-16 bg-white border-t border-gray-100 flex justify-center">
        <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm font-bold text-gray-400">
          <p>© 2026 LUCID ACADEMY. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <span className="hover:text-[#003366] cursor-pointer">이용약관</span>
            <span className="text-[#003366] cursor-pointer">개인정보보호정책</span>
          </div>
        </div>
      </footer>

      {/* 로그인 모달 */}
      {isLoginOpen && (
        <LoginModal 
          onClose={() => {
          setIsLoginOpen(false);
          const userInfo = localStorage.getItem("userInfo");
         if (userInfo) {
           window.location.reload(); // 가장 확실한 방법입니다.
           }
         }} 
       />
      )}
    </div>
  );
};

export default Home;