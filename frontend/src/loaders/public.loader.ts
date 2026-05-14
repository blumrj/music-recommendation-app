import { redirect } from "react-router-dom"

export const loader = ({ request }: { request?: Request }) => {
  const path = request ? new URL(request.url).pathname : "?";
  console.log("📱 Public loader - checking path:", path);
  
  const accessToken = localStorage.getItem("accessToken")
  console.log("  Access token exists:", !!accessToken);

  if(accessToken){
    console.log("  ✅ Token found, redirecting to /");
    return redirect("/")
  }

  console.log("  ✅ No token, allowing access to public page");
  return null
}


