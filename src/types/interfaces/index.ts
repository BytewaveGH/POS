export interface IGeneric {
  [x: string]: string | number | undefined | ISubGeneric | File | null
}

export interface ISubGeneric {
  [x: string]: string | number | undefined | File | string[] | number[] | []
}

export namespace IAuth {
  export interface Response {
    data: {
      accessToken: string
      refreshToken: string
      accessTokenExpiry: number
      refreshTokenExpiry: number
      user: {
        id: number
        username: string
        accountType: string
        avatar: string
        phone: string
        email: string
        createdAt: string
        updatedAt: string
      }
    }
    status: boolean
  }
}

export interface UserPayload {
  data: {
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
    refreshTokenExpiry: number
    user: {
      id: number
      username: string
      accountType: string
      avatar: string
      phone: string
      email: string
      createdAt: string
      updatedAt: string
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
