export interface IGeneric {
  [x: string]: string | number | undefined | ISubGeneric | File | null
}

// Apparently we forgot that IGENERIC itself is a type. So we need to create a base one
export interface ISubGeneric {
  [x: string]: string | number | undefined | File | string[] | number[] | []
}

export interface UserPayload {
  data: {
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
    refreshTokenExpiry: number
    user: {
      id: number
      displayName: string
      email: string
      avatar: string
      tenant: string
    }
  }
  status: boolean
}

export interface SVGProps {
  width?: number | string
  height?: number | string
  fill?: string
  radius?: number
  offset?: number | string
  circumference?: number | string
  classname?: string
  styles?: React.CSSProperties
  value?: number
  stroke?: string
  verticalAxisTitle?: string
  horizontalAxisTitle?: string
}
