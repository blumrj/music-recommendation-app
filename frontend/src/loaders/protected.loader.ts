import { redirect } from "react-router-dom"

export const loader = ({ request }: { request?: Request }) => {
  const path = request ? new URL(request.url).pathname : "?";
  console.log("🔐 Protected loader - checking path:", path);
  
  const accessToken = localStorage.getItem("accessToken")
  console.log("  Access token exists:", !!accessToken);

  if(!accessToken){
    console.log("  ❌ No token found, redirecting to /login");
    return redirect("/login")
  }

  console.log("  ✅ Token found, access granted");
  return null
}

