import { redirect } from "react-router-dom"

export const loader = () => {
  const accessToken = localStorage.getItem("accessToken")

  if(!accessToken){
    return redirect("/login")
  }

  return null
}

